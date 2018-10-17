/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { Importer } from './importer';

export class JsonImporter extends Importer {
  constructor(results) {
    super(results);
  }

  async read(json) {
    console.log('read json file');
    console.time('read json file');

    try {
      const splitJson = json.split(/}\s*\n/);

      const ndjson = [];
      for (let i = 0; i < splitJson.length; i++) {
        ndjson.push(`${splitJson[i]}}`);
      }

      this.docArray = ndjson;

      console.timeEnd('read json file');
      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      console.timeEnd('read json file');
      return {
        success: false,
        error,
      };
    }
  }
}
