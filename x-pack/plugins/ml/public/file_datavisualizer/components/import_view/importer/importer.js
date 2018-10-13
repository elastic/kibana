/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ml } from '../../../../services/ml_api_service';
import { chunk } from 'lodash';

const CHUNK_SIZE = 10000;

export class Importer {
  constructor(results) {
    this.results = results;
    this.data = [];
    this.docArray = [];
  }

  async import(index, setImportProgress) {
    console.log('create index and ingest');
    console.time('create index and ingest');
    if (!index) {
      return;
    }

    const mappings = this.results.mappings;
    const chunks = chunk(this.docArray, CHUNK_SIZE);

    let id = undefined;
    let success = true;

    for (let i = 0; i < chunks.length; i++) {
      const data = chunks[i];
      const resp = await ml.fileDatavisualizer.import({ id, index, data, mappings });
      if (resp.success) {
        id = resp.id;
        setImportProgress((i / chunks.length) * 100);
      } else {
        console.error(resp);
        success = false;
        break;
      }
      console.log(i, resp);
    }
    if (success) {
      setImportProgress(100);
    }
    console.timeEnd('create index and ingest');
    return success;
  }
}


