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
    // add an empty chunk to the beginning so the first
    // import request only creates the index and pipeline
    // and returns quickly
    chunks.unshift([]);

    const mappings = this.results.mappings;
    const ingestPipeline = this.results.ingest_pipeline;
    updatePipelineTimezone(ingestPipeline);

    let id = undefined;
    let success = true;
    const failures = [];

    for (let i = 0; i < chunks.length; i++) {
      const aggs = {
        id,
        index,
        data: chunks[i],
        mappings,
        ingestPipeline
      };
      const resp = await ml.fileDatavisualizer.import(aggs);

      if (resp.success || (resp.success === false && (resp.failures.length < resp.docCount))) {
        // allow some failures. however it must be less than the total number of docs sent
        id = resp.id;
        setImportProgress((i / chunks.length) * 100);
      } else {
        console.error(resp);
        success = false;
        break;
      }

      if (resp.failures.length) {
        // update the item value to include the chunk count
        // e.g. item 3 in chunk 2 is actually item 20003
        for (let f = 0; f < resp.failures.length; f++) {
          const failure = resp.failures[f];
          failure.item = failure.item + (CHUNK_SIZE * i);
        }
        failures.push(...resp.failures);
      }
    }

    console.log('total failures', failures);
    if (success) {
      setImportProgress(100);
    }
    console.timeEnd('create index and ingest');
    return { success, failures };
  }
}

// The file structure endpoint sets the timezone to be {{ beat.timezone }}
// as that's the variable Filebeat would send the client timezone in.
// In this data import function the UI is effectively performing the role of Filebeat,
// i.e. doing basic parsing, processing and conversion to JSON before forwarding to the ingest pipeline.
// But it's not sending every single field that Filebeat would add, so the ingest pipeline
// cannot look for a beat.timezone variable in each input record.
// Therefore we need to replace {{ beat.timezone }} with the actual browser timezone
function updatePipelineTimezone(ingestPipeline) {
  if (ingestPipeline !== undefined && ingestPipeline.processors && ingestPipeline.processors) {
    const dateProcessor = ingestPipeline.processors.find(p => (p.date !== undefined && p.date.timezone === '{{ beat.timezone }}'));

    if (dateProcessor) {
      dateProcessor.date.timezone = moment.tz.guess();
    }
  }
}
