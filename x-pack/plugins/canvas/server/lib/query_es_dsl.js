/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function flatten(obj, keyPrefix = '') {
  let topLevelKeys = {};
  const nestedRows = [];
  Object.keys(obj).forEach(key => {
    if (Array.isArray(obj[key])) {
      nestedRows.push(
        ...obj[key]
          .map(nestedRow => flatten(nestedRow, keyPrefix + '.' + key))
          .reduce((acc, obj) => [...acc, ...obj], [])
      );
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      const subRows = flatten(obj[key], keyPrefix + '.' + key);
      if (subRows.length === 1) {
        topLevelKeys = { ...topLevelKeys, ...subRows[0] };
      } else {
        nestedRows.push(...subRows);
      }
    } else {
      topLevelKeys[keyPrefix + '.' + key] = obj[key];
    }
  });
  if (nestedRows.length === 0) {
    return [topLevelKeys];
  } else {
    return nestedRows.map(nestedRow => ({ ...nestedRow, ...topLevelKeys }));
  }
}

export const queryEsDSL = (elasticsearchClient, { index, query }) =>
  elasticsearchClient('transport.request', {
    path: `/${index}/_search`,
    method: 'POST',
    body: {
      aggs: JSON.parse(query),
      size: 0,
    },
  })
    .then(res => {
      console.log(res);
      const rows = flatten(res);
      const columns = Object.keys(rows[0]).map(key => ({ id: key, name: key, type: typeof rows[0][key] }));

      return {
        type: 'datatable',
        columns,
        rows,
      };
    })
    .catch(e => {
      throw new Error(`Unexpected error from Elasticsearch: ${e.message}`);
    });
