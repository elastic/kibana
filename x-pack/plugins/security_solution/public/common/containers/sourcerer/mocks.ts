/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityPageName } from './constants';
import { getSourceDefaults } from './index';

export const mockPatterns = [
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
];

export const mockSourceGroups = {
  [SecurityPageName.default]: [
    'apm-*-transaction*',
    'auditbeat-*',
    'blobbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'winlogbeat-*',
  ],
  [SecurityPageName.host]: [
    'apm-*-transaction*',
    'endgame-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
};

export const mockSourceSelections = {
  [SecurityPageName.default]: ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
  [SecurityPageName.host]: ['endgame-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
};
export const mockSource = (testId: SecurityPageName.default | SecurityPageName.host) => ({
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
            indexes: mockSourceSelections[testId],
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

export const mockSourceGroup = (testId: SecurityPageName.default | SecurityPageName.host) => {
  const indexes = mockSourceSelections[testId];
  return {
    ...getSourceDefaults(testId, mockPatterns),
    defaultPatterns: mockSourceGroups[testId],
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
    indexPatterns: indexes,
    indicesExist: true,
    loading: false,
  };
};
