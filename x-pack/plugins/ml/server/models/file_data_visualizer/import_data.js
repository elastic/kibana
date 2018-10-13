/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export function importDataProvider(callWithRequest) {
  async function importData(id, index, mappings, data) {
    // console.log(id, index, mappings, data);
    try {

      // first chunk of data, create the index and id to return
      if (id === undefined) {
        id = generateId();
        await createIndex(index, mappings);
      }

      if (indexExits(index)) {
        await indexData(index, data);
      }

      return {
        id,
        success: true,
      };
    } catch (error) {
      console.error(error);

      return {
        id,
        success: false,
        error,
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

  async function indexData(index, data) {
    const type = '_doc';
    const body = [];
    data.forEach((d) => {
      body.push({ index: {} });
      body.push(d);
    });
    await callWithRequest('bulk', { index, type, body });
  }

  async function indexExits(index) {
    return await callWithRequest('indices.exists', { index });
  }

  return {
    importData,
  };
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
