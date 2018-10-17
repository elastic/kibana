/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function importDataProvider(callWithRequest) {
  async function importData(id, index, mappings, ingestPipeline, data) {
    let pipelineId;
    const docCount = data.length;

    try {

      if (ingestPipeline === undefined || ingestPipeline.id === undefined) {
        throw 'No ingest pipeline id specified';
      }

      pipelineId = ingestPipeline.id;

      if (id === undefined) {
        // first chunk of data, create the index and id to return
        id = generateId();
        await createIndex(index, mappings);

        delete ingestPipeline.id;

        const success = await createPipeline(pipelineId, ingestPipeline);
        if (success.acknowledged !== true) {
          console.error(success);
          throw success;
        }

        console.log('created pipeline', pipelineId);
      }

      if (data.length && indexExits(index)) {
        const resp = await indexData(index, pipelineId, data);
        if (resp.success === false) {
          throw resp;
        }
      }

      return {
        success: true,
        id,
        pipelineId,
        docCount,
        failures: [],
      };
    } catch (error) {
      return {
        success: false,
        id,
        pipelineId,
        error,
        docCount,
        failures: (error.failures ? error.failures : [])
      };
    }
  }

  async function createIndex(index, mappings) {
    if (await indexExits(index) === false) {
      const body = {
        mappings: {
          _doc: {
            properties: mappings
          }
        }
      };

      console.log('creating index');
      const gg = await callWithRequest('indices.create', { index, body });
      console.log(gg);
    } else {
      throw `${index} already exists.`;
    }
  }

  async function indexData(index, pipelineId, data) {
    try {
      const type = '_doc';
      const body = [];
      for (let i = 0; i < data.length; i++) {
        body.push({ index: {} });
        body.push(data[i]);
      }

      const settings = { index, type, body };
      if (pipelineId !== undefined) {
        settings.pipeline = pipelineId;
      }

      const resp = await callWithRequest('bulk', settings);
      if (resp.errors) {
        throw resp;
      } else {
        return {
          success: true,
          docs: data.length,
          failures: [],
        };
      }
    } catch (error) {
      const failures = getFailures(error.items || []);
      return {
        success: false,
        error,
        docs: data.length,
        failures,
      };
    }

  }

  async function indexExits(index) {
    return await callWithRequest('indices.exists', { index });
  }

  async function createPipeline(id, pipeline) {
    return await callWithRequest('ingest.putPipeline', { id, body: pipeline });
  }

  function getFailures(items) {
    const failures = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.index && item.index.error) {
        failures.push({
          item: i,
          reason: item.index.error.reason,
        });
      }
    }
    return failures;
  }

  return {
    importData,
  };
}


function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
