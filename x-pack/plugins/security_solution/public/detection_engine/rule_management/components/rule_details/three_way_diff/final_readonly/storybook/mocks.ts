/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataSourceType, KqlQueryType } from '../../../../../../../../common/api/detection_engine';
import type {
  DiffableAllFields,
  SavedKqlQuery,
} from '../../../../../../../../common/api/detection_engine';

export const filters = [
  {
    meta: {
      disabled: false,
      negate: false,
      alias: null,
      index: 'logs-*',
      key: '@timestamp',
      field: '@timestamp',
      value: 'exists',
      type: 'exists',
    },
    query: {
      exists: {
        field: '@timestamp',
      },
    },
    $state: {
      store: 'appState',
    },
  },
];

export const savedQueryResponse = {
  id: 'fake-saved-query-id',
  attributes: {
    title: 'Fake Saved Query',
    description: '',
    query: {
      query: 'file.path: "/etc/passwd" and event.action: "modification"',
      language: 'kuery',
    },
    filters,
  },
  namespaces: ['default'],
};

export const inlineKqlQuery: DiffableAllFields['kql_query'] = {
  type: KqlQueryType.inline_query,
  query: 'event.action: "user_login" and source.ip: "192.168.1.100"',
  language: 'kuery',
  filters,
};

export const savedKqlQuery: SavedKqlQuery = {
  type: KqlQueryType.saved_query,
  saved_query_id: 'fake-saved-query-id',
};

export const eqlQuery: DiffableAllFields['eql_query'] = {
  query: 'process where process.name == "powershell.exe" and process.args : "* -EncodedCommand *"',
  language: 'eql',
  filters,
};

export const dataSourceWithIndexPatterns: DiffableAllFields['data_source'] = {
  type: DataSourceType.index_patterns,
  index_patterns: ['logs-*'],
};

export const dataSourceWithDataView: DiffableAllFields['data_source'] = {
  type: DataSourceType.data_view,
  data_view_id: 'logs-*',
};

type DataViewDeps = ConstructorParameters<typeof DataView>[0];

export function mockDataView(spec: Partial<DataViewDeps['spec']> = {}): DataView {
  const dataView = new DataView({
    spec: {
      title: 'logs-*',
      fields: {
        '@timestamp': {
          name: '@timestamp',
          type: 'date',
          searchable: true,
          aggregatable: true,
        },
      },
      ...spec,
    },
    fieldFormats: {
      getDefaultInstance: () => ({
        toJSON: () => ({}),
      }),
    } as unknown as FieldFormatsStartCommon,
  });

  return dataView;
}
