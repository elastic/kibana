/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ml } from '../../../../services/ml_api_service';
import { chunk } from 'lodash';
import moment from 'moment';

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

    const chunks = chunk(this.docArray, CHUNK_SIZE);
    const mappings = this.results.mappings;
    const ingestPipeline = this.results.ingest_pipeline;
    updatePipelineTimezone(ingestPipeline);

    let id = undefined;
    let success = true;
    let failures = 0;

    for (let i = 0; i < chunks.length; i++) {
      const data = chunks[i];
      const resp = await ml.fileDatavisualizer.import({ id, index, data, mappings, ingestPipeline });
      if (resp.success || (resp.success === false && (resp.failures < resp.docs))) {
        id = resp.id;
        setImportProgress((i / chunks.length) * 100);
      } else {
        console.error(resp);
        success = false;
        break;
      }
      failures += resp.failures;
      console.log(i, resp);
    }

    console.log('total failures', failures);
    if (success) {
      setImportProgress(100);
    }
    console.timeEnd('create index and ingest');
    return success;
  }
}

function updatePipelineTimezone(ingestPipeline) {
  if (ingestPipeline !== undefined && ingestPipeline.processors && ingestPipeline.processors) {
    ingestPipeline.processors.find((p) => {
      if (p.date !== undefined && p.date.timezone === '{{ beat.timezone }}') {
        p.date.timezone = moment.tz.guess();
      }
    });
  }
}
