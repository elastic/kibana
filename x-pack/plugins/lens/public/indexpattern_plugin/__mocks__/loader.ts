/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getIndexPatterns() {
  return new Promise(resolve => {
    resolve([
      {
        id: '1',
        title: 'Fake Index Pattern',
        timeFieldName: 'timestamp',
        fields: [
          {
            name: 'timestamp',
            type: 'date',
            aggregatable: true,
            searchable: true,
          },
          {
            name: 'bytes',
            type: 'number',
            aggregatable: true,
            searchable: true,
          },
          {
            name: 'source',
            type: 'string',
            aggregatable: true,
            searchable: true,
          },
        ],
      },
      {
        id: '2',
        title: 'Fake Rollup Pattern',
        timeFieldName: 'timestamp',
        fields: [
          {
            name: 'timestamp',
            type: 'date',
            aggregatable: true,
            searchable: true,
          },
          {
            name: 'bytes',
            type: 'number',
            aggregatable: true,
            searchable: true,
          },
          {
            name: 'source',
            type: 'string',
            aggregatable: true,
            searchable: true,
          },
        ],
      },
    ]);
  });
}
