/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefinitionEntity } from '../common/entities';

export const dataStreamsEntity: DefinitionEntity = {
  id: 'data_streams',
  displayName: 'Data streams',
  type: 'data_stream',
  pivot: {
    identityFields: ['data_stream.dataset', 'data_stream.type', 'data_stream.namespace'],
  },
  filters: [
    {
      index: ['logs-*', 'metrics-*', 'traces-*'],
    },
  ],
};

export const builtinEntityDefinitions = [dataStreamsEntity];
