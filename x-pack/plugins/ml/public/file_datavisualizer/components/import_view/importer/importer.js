/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ml } from '../../../../services/ml_api_service';
import { chunk } from 'lodash';
import moment from 'moment';

const CHUNK_SIZE = 10000;
const IMPORT_RETRIES = 5;

export class Importer {
  constructor(results) {
    this.results = results;
    this.data = [];
    this.docArray = [];
  }

  async initializeImport(index) {

    const mappings = this.results.mappings;
    const pipeline = this.results.ingest_pipeline;
    updatePipelineTimezone(pipeline);
    const ingestPipeline = {
      id: `${index}-pipeline`,
      pipeline,
    };

    const createIndexResp = await ml.fileDatavisualizer.import({
      id: undefined,
      index,
      data: [],
      mappings,
      ingestPipeline
    });

    return createIndexResp;
  }

  async import(id, index, pipelineId, setImportProgress) {
    console.log('create index and ingest');
    console.time('create index and ingest');
    if (!id || !index) {
      return {
        success: false,
        error: 'no id ot index supplied'
      };
    }

    const chunks = chunk(this.docArray, CHUNK_SIZE);

    const ingestPipeline = {
      id: pipelineId,
    };

    let success = true;
    const failures = [];
    let error;

    for (let i = 0; i < chunks.length; i++) {
      const aggs = {
        id,
        index,
        data: chunks[i],
        mappings: {},
        ingestPipeline
      };

      let retries = IMPORT_RETRIES;
      let resp = {
        success: false,
        failures: [],
        docCount: 0,
      };

      while (resp.success === false && retries > 0) {
        resp = await ml.fileDatavisualizer.import(aggs);

        if (retries < IMPORT_RETRIES) {
          console.log(`Retrying import ${IMPORT_RETRIES - retries}`);
        }

        retries--;
      }

      if (resp.success) {
        setImportProgress(((i + 1) / chunks.length) * 100);
      } else {
        console.error(resp);
        success = false;
        error = resp.error;
        break;
      }

      if (resp.failures && resp.failures.length) {
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
    console.timeEnd('create index and ingest');

    const result = {
      success,
      failures,
    };

    if (success) {
      setImportProgress(100);
    } else {
      result.error = error;
    }

    return result;
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
