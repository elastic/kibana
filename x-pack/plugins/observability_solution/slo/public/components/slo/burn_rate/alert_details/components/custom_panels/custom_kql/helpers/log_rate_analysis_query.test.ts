/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQueryForLogRateAnalysis } from './log_rate_analysis_query';

describe('buildEsQuery', () => {
  // const index = 'mockedIndex';

  const testData = [
    {
      title: 'rule with good query (as KQL), no optional filter and no total',
      params: {
        filter: '',
        total: '',
        good: 'http.response.status_code < 500',
      },
    },
    {
      title: 'rule with good query (as filter), no optional filter and no total',
      params: {
        filter: '',
        total: '',
        good: {
          kqlQuery: '',
          filters: [
            {
              $state: {
                store: 'appState',
              },
              meta: {
                field: 'http.response.status_code',
                negate: false,
                alias: null,
                index: 'kbn-data-forge-fake_stack.admin-console-*-id',
                disabled: false,
                params: {
                  lt: '500',
                },
                type: 'range',
                key: 'http.response.status_code',
              },
              query: {
                range: {
                  'http.response.status_code': {
                    lt: '500',
                  },
                },
              },
            },
          ],
        },
      },
    },
    {
      title: 'rule with good query (as KQL), with optional filter (as KQL) and not total filter',
      params: {
        total: '',
        good: 'http.response.status_code < 500',
        filter: 'host.name: admin-console.prod.001',
      },
    },
    {
      title: 'rule with good query (as KQL), with optional filter (as filter) and not total filter',
      params: {
        total: '',
        good: 'http.response.status_code < 500',
        filter: {
          kqlQuery: '',
          filters: [
            {
              $state: {
                store: 'appState',
              },
              meta: {
                field: 'host.name',
                negate: false,
                alias: null,
                index: 'kbn-data-forge-fake_stack.admin-console-*-id',
                disabled: false,
                params: {
                  query: 'admin-console.prod.001',
                },
                type: 'phrase',
                key: 'host.name',
              },
              query: {
                match_phrase: {
                  'host.name': 'admin-console.prod.001',
                },
              },
            },
          ],
        },
      },
    },
    {
      title:
        'rule with good query (as KQL), with optional filter (as KQL) and total filter (as KQL)',
      params: {
        good: 'http.response.status_code < 500',
        filter: 'host.name: admin-console.prod.001',
        total: 'http.response.status_code: *',
      },
    },
    {
      title:
        'rule with good query (as filter), with optional filter (as filter) and total filter (as KQL)',
      params: {
        good: {
          kqlQuery: '',
          filters: [
            {
              $state: {
                store: 'appState',
              },
              meta: {
                field: 'http.response.status_code',
                negate: false,
                alias: null,
                index: 'kbn-data-forge-fake_stack.admin-console-*-id',
                disabled: false,
                params: {
                  lt: '500',
                },
                type: 'range',
                key: 'http.response.status_code',
              },
              query: {
                range: {
                  'http.response.status_code': {
                    lt: '500',
                  },
                },
              },
            },
          ],
        },
        filter: {
          kqlQuery: '',
          filters: [
            {
              $state: {
                store: 'appState',
              },
              meta: {
                field: 'host.name',
                negate: false,
                alias: null,
                index: 'kbn-data-forge-fake_stack.admin-console-*-id',
                disabled: false,
                params: {
                  query: 'admin-console.prod.001',
                },
                type: 'phrase',
                key: 'host.name',
              },
              query: {
                match_phrase: {
                  'host.name': 'admin-console.prod.001',
                },
              },
            },
          ],
        },
        total: 'http.response.status_code: *',
      },
    },
  ];

  test.each(testData)('should generate correct es query for $title', ({ params }) => {
    expect(getESQueryForLogRateAnalysis(params)).toMatchSnapshot();
  });
});
