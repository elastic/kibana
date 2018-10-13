/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function importDataProvider(callWithRequest) {
  async function importData(id, index, mappings, ingestPipeline, data) {
    // console.log(id, index, mappings, data);
    try {

      // first chunk of data, create the index and id to return
      let pipelineId;
      if (id === undefined) {
        id = generateId();
        await createIndex(index, mappings);

        if (ingestPipeline !== undefined) {
          const pid = `${index}-pipeline`;
          const success = await createPipeline(pid, ingestPipeline);
          if (success.acknowledged === true) {
            pipelineId = pid;
          } else {
            console.error(success);
          }
          console.log('creating pipeline', pipelineId);
        }
      } else {
        if (ingestPipeline !== undefined) {
          pipelineId = `${index}-pipeline`;
        }
      }

      if (indexExits(index)) {
        const resp = await indexData(index, pipelineId, data);
        if (resp.success === false) {
          throw resp;
        }
      }

      return {
        id,
        success: true,
        docs: data.length,
        failures: 0,
      };
    } catch (error) {
      // console.error(error);

      return {
        id,
        success: false,
        error,
        docs: data.length,
        failures: (error.failures ? error.failures : data.length)
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
    const type = '_doc';
    const body = [];
    data.forEach((d) => {
      body.push({ index: {} });
      body.push(d);
    });

    const settings = { index, type, body };
    if (pipelineId !== undefined) {
      settings.pipeline = pipelineId;
    }

    const resp = await callWithRequest('bulk', settings);
    if (resp.errors) {
      return {
        success: false,
        error: resp,
        docs: data.length,
        failures: countErrors(resp.items),
      };
    } else {
      return {
        success: true,
        docs: data.length,
        failures: 0,
      };
    }
    // console.log(resp);
  }

  async function indexExits(index) {
    return await callWithRequest('indices.exists', { index });
  }

  async function createPipeline(id, pipeline) {
    return await callWithRequest('ingest.putPipeline', { id, body: pipeline });
  }

  function countErrors(items) {
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.index && item.index.error) {
        count++;
      }
    }
    return count;
  }

  return {
    importData,
  };
}


function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
