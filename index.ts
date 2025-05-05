import { createReadStream, createWriteStream, ReadStream, WriteStream } from "node:fs";
import { constants, access } from "node:fs/promises";
import { extname } from "node:path";
import { Transform, TransformCallback } from "node:stream";
import JSONStream from "JSONStream";

type JSONObject = Record<string, any>;

async function validateInputFile(filePath?: string): Promise<void> {
  if (!filePath) {
    console.error("Usage: node index.js input.json output.csv");
    process.exit(1);
  }

  if (extname(filePath) !== ".json") {
    console.error("The file must have the extension .json");
    process.exit(1);
  }

  try {
    await access(filePath, constants.R_OK);
  } catch (err) {
    console.error("File does not exist or is unreadable");
    process.exit(1);
  }
}

async function json2csv(): Promise<void> {
  const inputFilePath: string = process.argv[2];
  const outputFilePath: string = process.argv[3];

  let isHeadersAdd: boolean = false;
  let headers: string[] = [];

  await validateInputFile(inputFilePath);

  const transformToCSV: Transform = new Transform({
    writableObjectMode: true,

    transform(obj: JSONObject, _encoding: BufferEncoding, callback: TransformCallback) {
      if (!isHeadersAdd) {
        headers = Object.keys(obj);

        this.push(headers.join(",") + "\n");

        isHeadersAdd = true;
      }

      const row: string = headers.map((colName) => obj[colName] ?? "").join(",");

      this.push(row + "\n");

      callback();
    },
  });

  const startTime = Date.now();

  const readableStream: ReadStream = createReadStream(inputFilePath, "utf8");
  const writableStream: WriteStream = createWriteStream(outputFilePath);
  const jsonParser = JSONStream.parse("*");

  readableStream
    .pipe(jsonParser)
    .pipe(transformToCSV)
    .pipe(writableStream)
    .on("finish", () => {
      const parseSeconds: number = (Date.now() - startTime) / 1000;

      console.log(`Successful parse: ${parseSeconds}s`);
    });
}


await json2csv();