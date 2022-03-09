/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldList } from 'src/plugins/data_views/common';

export const createResolvedLogViewMock = (): ResolvedLogView => ({
  name: 'LOG VIEW',
  description: 'LOG VIEW DESCRIPTION',
  indices: 'log-indices-*',
  timestampField: 'TIMESTAMP_FIELD',
  tiebreakerField: 'TIEBREAKER_FIELD',
  messageField: ['MESSAGE_FIELD'],
  fields: fieldList(),
  runtimeMappings: {
    runtime_field: {
      type: 'keyword',
      script: {
        source: 'emit("runtime value")',
      },
    },
  },
  columns: [
    { timestampColumn: { id: 'TIMESTAMP_COLUMN_ID' } },
    {
      fieldColumn: {
        id: 'DATASET_COLUMN_ID',
        field: 'event.dataset',
      },
    },
    {
      messageColumn: { id: 'MESSAGE_COLUMN_ID' },
    },
  ],
});
