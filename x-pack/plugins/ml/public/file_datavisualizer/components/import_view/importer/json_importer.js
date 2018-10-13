/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { Importer } from './importer';
import { parse } from './csv_parse';
// import csvParse from 'csv-parse';

export class JsonImporter extends Importer {
  constructor(results) {
    super(results);

    this.format = results.format;
    this.delimiter = results.delimiter;
    this.quote = results.quote;
    this.hasHeaderRow = results.has_header_row;
    this.columnNames = results.column_names;
  }

  async read(csv) {
    console.log('read file');
    console.time('read file');

    try {
      const settings = {
        delimiter: this.delimiter,
        quote: this.quote,
      };
      // const parser = csvParse(settings);
      // parser.write(csv);
      // parser.end();

      this.data = await parse(csv, settings);
      // const output = [];
      // parser.on('readable', () => {
      //   let record;
      //   while (record = parser.read()) {
      //     output.push(record);
      //   }
      // });

      // parser.on('error', (err) => {
      //   console.error(err.message);
      // });

      // parser.on('end', () => {
      //   console.log('output', output);
      //   console.timeEnd('read file');
      // });

      if (this.hasHeaderRow) {
        this.data.shift();
      }

      this.docArray = formatToJson(this.data, this.columnNames);
      console.timeEnd('read file');

      return true;
    } catch (error) {
      console.error(error);
      console.timeEnd('read file');
      return false;
    }
  }
}

function formatToJson(data, columnNames) {
  console.log('formatToJson');
  const docArray = [];
  for (let i = 0; i < data.length; i++) {
    const line = {};
    for (let c = 0; c < columnNames.length; c++) {
      const col = columnNames[c];
      line[col] = data[i][c];
    }
    docArray.push(line);
  }
  return docArray;
}
