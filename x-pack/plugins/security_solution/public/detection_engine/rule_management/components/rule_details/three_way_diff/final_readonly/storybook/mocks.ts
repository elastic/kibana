/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSourceType, KqlQueryType } from '../../../../../../../../common/api/detection_engine';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';

export const filtersMock = [
  {
    meta: {
      disabled: false,
      negate: false,
      alias: null,
      index: '',
      key: 'Responses.message',
      field: 'Responses.message',
      params: ['test-1', 'test-2'],
      value: ['test-1', 'test-2'],
      type: 'phrases',
    },
    query: {
      bool: {
        minimum_should_match: 1,
        should: [
          { match_phrase: { 'Responses.message': 'test-1' } },
          { match_phrase: { 'Responses.message': 'test-2' } },
        ],
      },
    },
    $state: { store: 'appState' },
  },
];

export const indexPatternsDataSource: DiffableAllFields['data_source'] = {
  type: DataSourceType.index_patterns,
  index_patterns: ['logs-*'],
};

export const dataViewDataSource: DiffableAllFields['data_source'] = {
  type: DataSourceType.data_view,
  data_view_id: 'logs-*',
};

export const inlineKqlQuery: DiffableAllFields['kql_query'] = {
  type: KqlQueryType.inline_query,
  query: '*',
  language: 'kuery',
  filters: filtersMock,
};

export const dataSourceWithIndexPatterns: DiffableAllFields['data_source'] = {
  type: DataSourceType.index_patterns,
  index_patterns: ['logs-*'],
};

export const dataSourceWithDataView: DiffableAllFields['data_source'] = {
  type: DataSourceType.data_view,
  data_view_id: 'logs-*',
};
