/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sourcererModel } from '../../store/sourcerer';
import { initSourcererScope } from '../../store/sourcerer/model';

export const mockPatterns = [
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
  'journalbeat-*',
];

// export const mockSourcererScopes = sourcererModel.sourcererScopePatterns;

export const mockSource = (testId) => ({
  data: {
    source: {
      id: 'default',
      status: {
        indicesExist: true,
        indexFields: [
          {
            category: '_id',
            description: 'Each document has an _id that uniquely identifies it',
            example: 'Y-6TfmcB0WOhS6qyMv3s',
            indexes: mockPatterns,
            // indexes: mockSourcererScopes[testId],
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
  },
  loading: false,
  networkStatus: 7,
  stale: false,
});

export const mockSourcererScope = (testId = sourcererModel.SourcererScopeName.default) => {
  const indexes = mockPatterns;
  return {
    ...initSourcererScope,
    scopePatterns: indexes,
    browserFields: {
      _id: {
        fields: {
          _id: {
            __typename: 'IndexField',
            aggregatable: false,
            category: '_id',
            description: 'Each document has an _id that uniquely identifies it',
            esTypes: null,
            example: 'Y-6TfmcB0WOhS6qyMv3s',
            format: null,
            indexes,
            name: '_id',
            searchable: true,
            subType: null,
            type: 'string',
          },
        },
      },
    },
    indexPattern: {
      fields: [
        {
          aggregatable: false,
          esTypes: null,
          name: '_id',
          searchable: true,
          subType: null,
          type: 'string',
        },
      ],
      title: indexes.join(),
    },
    selectedPatterns: indexes,
    indicesExist: true,
    loading: false,
  };
};
