/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

export const rollupSearchStrategy = {
  id: 'rollup',

  search: async ({ searchRequests, Promise }) => {
    // TODO: Batch together requests to hit a bulk rollup search endpoint.
    const searchRequest = searchRequests[0];
    const {
      index: { title: indexPattern },
      body: {
        size,
        aggs,
      },
    } = await searchRequest.getFetchParams();

    const index = indexPattern;
    const query = {
      'size': size,
      'aggregations': aggs,
    };

    return new Promise((resolve, reject) => {
      fetch('../api/rollup/search', {
        method: 'post',
        body: JSON.stringify({ index, query }),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'kbn-xsrf': 'kibana',
        },
        credentials: 'same-origin'
      }).then(response => {
        return response.json();
      }).then(data => {
        // Munge data into shape expected by consumer.
        resolve({
          took: data.took,
          responses: [ data ],
        });
      }).catch(error => {
        return reject(error);
      });
    });
  },

  isValidForSearchRequest: searchRequest => {
    const indexPattern = searchRequest.source.getField('index');
    return indexPattern.type === 'rollup';
  },
};
