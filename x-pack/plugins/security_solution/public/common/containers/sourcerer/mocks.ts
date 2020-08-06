/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockSource = {
  data: {
    source: {
      id: 'default',
      indicesExist: true,
      indexFields: [
        {
          category: '_id',
          description: 'Each document has an _id that uniquely identifies it',
          example: 'Y-6TfmcB0WOhS6qyMv3s',
          indexes: ['winlogbeat-*'],
          name: '_id',
          searchable: true,
          type: 'string',
          aggregatable: false,
          format: null,
          esTypes: null,
          subType: null,
          __typename: 'IndexField',
        },
      ],
    },
  },
  loading: false,
  networkStatus: 7,
  stale: false,
};
