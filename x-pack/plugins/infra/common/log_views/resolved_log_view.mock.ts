/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsContract, fieldList } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { defaultLogViewsStaticConfig } from './defaults';
import { ResolvedLogView, resolveLogView } from './resolved_log_view';
import { LogViewAttributes } from './types';
import { DataViewSpec } from '@kbn/data-views-plugin/common';

export const createResolvedLogViewMock = (
  resolvedLogViewOverrides: Partial<ResolvedLogView> = {}
): ResolvedLogView => ({
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
  dataViewReference: createStubDataView({
    spec: {
      id: 'log-view-data-view-mock',
      title: 'log-indices-*',
    },
  }),
  ...resolvedLogViewOverrides,
});

export const createResolvedLogViewMockFromAttributes = (logViewAttributes: LogViewAttributes) =>
  resolveLogView(
    'log-view-id',
    logViewAttributes,
    {
      get: async () => createStubDataView({ spec: {} }),
      getFieldsForWildcard: async () => [],
      create: async (spec: DataViewSpec) =>
        createStubDataView({
          spec,
        }),
    } as unknown as DataViewsContract,
    defaultLogViewsStaticConfig
  );
