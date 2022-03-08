/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';

export const getHostDetailsPageFilter = (hostName?: string): Filter[] =>
  hostName
    ? [
        {
          meta: {
            index: 'e5bb994d-e8fb-4ddb-a36e-730ad8cc0712',
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.name',
            params: {
              query: hostName,
            },
          },
          query: {
            match_phrase: {
              'host.name': hostName,
            },
          },
        },
      ]
    : [];

export const filterHostExternalAlertData: Filter[] = [
  {
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  exists: {
                    field: 'host.name',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    meta: {
      alias: '',
      disabled: false,
      key: 'bool',
      negate: false,
      type: 'custom',
      value:
        '{"query": {"bool": {"filter": [{"bool": {"should": [{"exists": {"field": "host.name"}}],"minimum_should_match": 1}}]}}}',
    },
  },
];

export const filterNetworkExternalAlertData: Filter[] = [
  {
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'source.ip',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: 'destination.ip',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    meta: {
      alias: '',
      disabled: false,
      key: 'bool',
      negate: false,
      type: 'custom',
      value:
        '{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"exists":{"field": "source.ip"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field": "destination.ip"}}],"minimum_should_match":1}}],"minimum_should_match":1}}]}}',
    },
  },
];

export const getIndexFilters = (selectedPatterns: string[]) =>
  selectedPatterns.length >= 1
    ? [
        {
          meta: {
            index: '62d8e968-7ce3-4062-98b8-64b0e0bbff59',
            type: 'phrases',
            key: '_index',
            params: selectedPatterns,
            alias: null,
            negate: false,
            disabled: false,
          },
          query: {
            bool: {
              should: selectedPatterns.map((selectedPattern) => ({
                match_phrase: { _index: selectedPattern },
              })),
              minimum_should_match: 1,
            },
          },
          $state: {
            store: 'appState',
          },
        },
      ]
    : [];
