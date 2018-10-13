/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { Importer } from './importer';

export class SstImporter extends Importer {
  constructor(results) {
    super(results);

    this.format = results.format;
    this.multilineStartPattern = results.multiline_start_pattern;
    this.grokPattern = results.grok_pattern;
  }

  async read(text) {
    console.log('read sst file');
    console.time('read sst file');

    try {
      const data = [];

      let line = '';
      let tempLine = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\n') {
          if (tempLine.match(this.multilineStartPattern) !== null) {
            data.push({ message: line });
            line = '';
          } else {
            line += char;
          }
          line += tempLine;
          tempLine = '';
        } else {
          tempLine += char;
        }
      }

      if (data[0] && data[0].message === '') {
        data.shift();
      }
      this.data = data;
      this.docArray = this.data;
      // this.docArray = formatToJson(this.data);

      // console.log(data);
      console.timeEnd('read sst file');
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}

// function formatToJson(data) {
//   const docArray = [];
//   for (let i = 0; i < data.length; i++) {
//     docArray.push({ message: data[i] });
//   }
//   return docArray;
// }

