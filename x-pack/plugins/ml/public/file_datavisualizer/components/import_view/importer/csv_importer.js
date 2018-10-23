/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { Importer } from './importer';
import Papa from 'papaparse';

export class CsvImporter extends Importer {
  constructor(results, settings) {
    super(settings);

    this.format = results.format;
    this.delimiter = results.delimiter;
    this.quote = results.quote;
    this.hasHeaderRow = results.has_header_row;
    this.columnNames = results.column_names;
  }

  async read(csv) {
    try {
      const config = {
        header: false,
        skipEmptyLines: 'greedy',
        delimiter: this.delimiter,
        quoteChar: this.quote,
      };

      const parserOutput = Papa.parse(csv, config);

      if (parserOutput.errors.length) {
        // throw an error with the message of the first error encountered
        throw parserOutput.errors[0].message;
      }

      this.data = parserOutput.data;

      if (this.hasHeaderRow) {
        this.data.shift();
      }

      this.docArray = formatToJson(this.data, this.columnNames);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }
  }
}

function formatToJson(data, columnNames) {
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
