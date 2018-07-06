/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

export const rollupSearchStrategy = {
  id: 'rollup',

  search: (/*{ body }*/) => {
    // TODO: Replace this hardcoded dummy data with dynamically defined data.
    const index = 'test_rollup_index';
    const query = {
      'size': 0,
      'aggregations': {
        'max_bytes': {
          'max': {
            'field': 'bytes',
          },
        },
      },
    };

    // TODO: Handle errors gracefully and surface them to the user.
    return fetch('../api/rollup/search', {
      method: 'post',
      body: JSON.stringify({ index, query }),
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'kbn-xsrf': 'kibana',
      },
      credentials: 'same-origin'
    });
  },

  isValidForSearchRequest: searchRequest => {
    const indexPattern = searchRequest.source.getField('index');
    return indexPattern.type === 'rollup';
  },
};
