/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/common';

export const getSavedSearchForQuery = (query: string): SavedSearch => {
  return {
    searchSource: {
      id: 'data_source13',
      shouldOverwriteDataViewType: false,
      requestStartHandlers: [],
      inheritOptions: {},
      history: [],
      fields: {
        index: {},
        query: {
          esql: query,
        },
        filter: [],
      },
      dependencies: {},
    },
    usesAdHocDataView: true,
    columns: [],
    sort: [['@timestamp', 'desc']],
    hideChart: true,
    timeRange: {
      from: 'now-15m',
      to: 'now',
    },
    grid: {},
    isTextBasedQuery: true,
    title: 'ES|QL Query from Elastic AI Assistant',
    description: '',
  } as unknown as SavedSearch;
};
