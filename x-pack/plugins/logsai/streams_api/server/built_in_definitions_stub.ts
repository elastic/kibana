/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefinitionEntity, EntityTypeDefinition } from '../common/entities';

export const allDataStreamsEntity: DefinitionEntity = {
  id: 'data_streams',
  key: 'data_streams',
  displayName: 'Data streams',
  type: 'data_stream',
  pivot: {
    type: 'data_stream',
    identityFields: ['data_stream.dataset', 'data_stream.type', 'data_stream.namespace'],
  },
  filters: [
    {
      index: ['logs-*', 'metrics-*', 'traces-*', '.data_streams'],
    },
  ],
};

export const allLogsEntity: DefinitionEntity = {
  id: 'all_logs',
  key: 'all_logs',
  displayName: 'logs-*',
  type: 'data_stream',
  pivot: {
    type: 'data_stream',
    identityFields: ['data_stream.dataset', 'data_stream.type', 'data_stream.namespace'],
  },
  filters: [
    {
      index: ['logs-*', '.data_streams'],
    },
    {
      term: {
        'data_stream.type': 'logs',
      },
    },
  ],
};

export const allMetricsEntity: DefinitionEntity = {
  id: 'all_metrics',
  key: 'all_metrics',
  displayName: 'metrics-*',
  type: 'data_stream',
  pivot: {
    type: 'data_stream',
    identityFields: ['data_stream.dataset', 'data_stream.type', 'data_stream.namespace'],
  },
  filters: [
    {
      index: ['metrics-*', '.data_streams'],
    },
    {
      term: {
        'data_stream.type': 'metrics',
      },
    },
  ],
};

// export const allLogsEntity: DefinitionEntity = {
//   id: 'all_logs',
//   displayName: 'All logs',
//   type: 'data_stream',
//   pivot: {
//     identityFields: ['data_stream.dataset', 'data_stream.type', 'data_stream.namespace'],
//   },
//   filters: [
//     {
//       index: ['logs-*'],
//     },
//   ],
// };

export const builtinEntityDefinitions = [allDataStreamsEntity, allLogsEntity, allMetricsEntity];

const dataStreamTypeDefinition: EntityTypeDefinition = {
  displayName: 'Data streams',
  displayNameTemplate: {
    concat: [
      { field: 'data_stream.type' },
      { literal: '-' },
      { field: 'data_stream.dataset' },
      { literal: '-' },
      { field: 'data_stream.namespace' },
    ],
  },
  pivot: {
    type: 'data_stream',
    identityFields: ['data_stream.type', 'data_stream.dataset', 'data_stream.namespace'],
  },
};

export const builtinTypeDefinitions = [dataStreamTypeDefinition];
