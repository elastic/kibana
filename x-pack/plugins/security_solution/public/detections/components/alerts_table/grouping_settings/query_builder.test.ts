/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_QUERY_SIZE } from '../../../../common/components/grouping';
import { getAlertsGroupingQuery } from '.';

describe('getAlertsGroupingQuery', () => {
  it('returns query with aggregations for kibana.alert.rule.name', () => {
    const groupingQuery = getAlertsGroupingQuery({
      from: '2022-12-29T22:57:34.029Z',
      to: '2023-01-28T22:57:29.029Z',
      pageIndex: 0,
      pageSize: 25,
      runtimeMappings: {},
      selectedGroup: 'kibana.alert.rule.name',
      additionalFilters: [
        {
          bool: {
            must: [],
            filter: [
              {
                match_phrase: {
                  'kibana.alert.workflow_status': 'acknowledged',
                },
              },
            ],
            should: [],
            must_not: [
              {
                exists: {
                  field: 'kibana.alert.building_block_type',
                },
              },
            ],
          },
        },
      ],
    });

    expect(groupingQuery).toStrictEqual({
      _source: false,
      aggs: {
        alertsCount: {
          value_count: {
            field: 'kibana.alert.rule.name',
          },
        },
        groupsNumber: {
          cardinality: {
            field: 'kibana.alert.rule.name',
          },
        },
        stackByMultipleFields0: {
          aggs: {
            alertsCount: {
              cardinality: {
                field: 'kibana.alert.uuid',
              },
            },
            bucket_truncate: {
              bucket_sort: {
                from: 0,
                size: 25,
                sort: undefined,
              },
            },
            countSeveritySubAggregation: {
              cardinality: {
                field: 'kibana.alert.severity',
              },
            },
            hostsCountAggregation: {
              cardinality: {
                field: 'host.name',
              },
            },
            ruleTags: {
              terms: {
                field: 'kibana.alert.rule.tags',
              },
            },
            severitiesSubAggregation: {
              terms: {
                field: 'kibana.alert.severity',
              },
            },
            usersCountAggregation: {
              cardinality: {
                field: 'user.name',
              },
            },
          },
          multi_terms: {
            size: MAX_QUERY_SIZE,
            terms: [
              {
                field: 'kibana.alert.rule.name',
              },
              {
                field: 'kibana.alert.rule.description',
              },
            ],
          },
        },
      },
      query: {
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'kibana.alert.workflow_status': 'acknowledged',
                    },
                  },
                ],
                must: [],
                must_not: [
                  {
                    exists: {
                      field: 'kibana.alert.building_block_type',
                    },
                  },
                ],
                should: [],
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: '2022-12-29T22:57:34.029Z',
                  lte: '2023-01-28T22:57:29.029Z',
                },
              },
            },
          ],
        },
      },
      runtime_mappings: {},
      size: 0,
    });
  });

  it('returns default query with aggregations if the field specific metrics was not defined', () => {
    const groupingQuery = getAlertsGroupingQuery({
      from: '2022-12-29T22:57:34.029Z',
      to: '2023-01-28T22:57:29.029Z',
      pageIndex: 0,
      pageSize: 25,
      runtimeMappings: {},
      selectedGroup: 'process.name',
      additionalFilters: [
        {
          bool: {
            must: [],
            filter: [
              {
                match_phrase: {
                  'kibana.alert.workflow_status': 'acknowledged',
                },
              },
            ],
            should: [],
            must_not: [
              {
                exists: {
                  field: 'kibana.alert.building_block_type',
                },
              },
            ],
          },
        },
      ],
    });

    expect(groupingQuery).toStrictEqual({
      _source: false,
      aggs: {
        alertsCount: {
          value_count: {
            field: 'process.name',
          },
        },
        groupsNumber: {
          cardinality: {
            field: 'process.name',
          },
        },
        stackByMultipleFields0: {
          aggs: {
            alertsCount: {
              cardinality: {
                field: 'kibana.alert.uuid',
              },
            },
            bucket_truncate: {
              bucket_sort: {
                from: 0,
                size: 25,
                sort: undefined,
              },
            },
            rulesCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.rule_id',
              },
            },
          },
          terms: {
            field: 'process.name',
            size: 10000,
          },
        },
      },
      query: {
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'kibana.alert.workflow_status': 'acknowledged',
                    },
                  },
                ],
                must: [],
                must_not: [
                  {
                    exists: {
                      field: 'kibana.alert.building_block_type',
                    },
                  },
                ],
                should: [],
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: '2022-12-29T22:57:34.029Z',
                  lte: '2023-01-28T22:57:29.029Z',
                },
              },
            },
          ],
        },
      },
      runtime_mappings: {},
      size: 0,
    });
  });
});
