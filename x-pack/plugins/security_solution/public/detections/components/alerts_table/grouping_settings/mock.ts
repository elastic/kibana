/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAlertSearchResponse } from '../../alerts_kpis/alerts_treemap_panel/alerts_treemap/lib/mocks/mock_alert_search_response';

export const getQuery = (
  selectedGroup: string,
  uniqueValue: string,
  timeRange: { from: string; to: string }
) => ({
  _source: false,
  aggs: {
    unitsCount: {
      value_count: {
        field: 'groupByField',
      },
    },
    groupsCount: {
      cardinality: {
        field: 'groupByField',
      },
    },
    groupByFields: {
      aggs: {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
        description: {
          terms: {
            field: 'kibana.alert.rule.description',
            size: 1,
          },
        },
        bucket_truncate: {
          bucket_sort: {
            from: 0,
            size: 25,
            sort: [
              {
                unitsCount: {
                  order: 'desc',
                },
              },
            ],
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
      terms: {
        field: 'groupByField',
        size: 10000,
      },
    },
  },
  query: {
    bool: {
      filter: [
        { bool: { filter: [], must: [], must_not: [], should: [] } },
        {
          range: {
            '@timestamp': {
              gte: timeRange.from,
              lte: timeRange.to,
            },
          },
        },
      ],
    },
  },
  runtime_mappings: {
    groupByField: {
      type: 'keyword',
      script: {
        source:
          "if (doc[params['selectedGroup']].size()==0) { emit(params['uniqueValue']) } else { emit(doc[params['selectedGroup']].join(params['uniqueValue']))}",
        params: {
          selectedGroup,
          uniqueValue,
        },
      },
    },
  },
  size: 0,
});

export const groupingSearchResponse = {
  ...mockAlertSearchResponse,
  hits: {
    total: {
      value: 6048,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    groupsCount: {
      value: 32,
    },
    groupByFields: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: ['critical hosts [Duplicate]'],
          key_as_string: 'critical hosts [Duplicate]',
          doc_count: 300,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 300,
              },
              {
                key: 'rule',
                doc_count: 300,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 300,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'critical',
                doc_count: 300,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['critical hosts [Duplicate] [Duplicate]'],
          key_as_string: 'critical hosts [Duplicate] [Duplicate]',
          doc_count: 300,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 300,
              },
              {
                key: 'rule',
                doc_count: 300,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 300,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'critical',
                doc_count: 300,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['high hosts [Duplicate]'],
          key_as_string: 'high hosts [Duplicate]',
          doc_count: 300,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 300,
              },
              {
                key: 'rule',
                doc_count: 300,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 300,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'high',
                doc_count: 300,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['high hosts [Duplicate] [Duplicate]'],
          key_as_string: 'high hosts [Duplicate] [Duplicate]',
          doc_count: 300,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 300,
              },
              {
                key: 'rule',
                doc_count: 300,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 300,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'high',
                doc_count: 300,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['low hosts  [Duplicate]'],
          key_as_string: 'low hosts  [Duplicate]',
          doc_count: 300,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 300,
              },
              {
                key: 'rule',
                doc_count: 300,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 300,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 300,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['low hosts  [Duplicate] [Duplicate]'],
          key_as_string: 'low hosts  [Duplicate] [Duplicate]',
          doc_count: 300,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 300,
              },
              {
                key: 'rule',
                doc_count: 300,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 300,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 300,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['medium hosts [Duplicate]'],
          key_as_string: 'medium hosts [Duplicate]',
          doc_count: 300,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 300,
              },
              {
                key: 'rule',
                doc_count: 300,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 300,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'medium',
                doc_count: 300,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['medium hosts [Duplicate] [Duplicate]'],
          key_as_string: 'medium hosts [Duplicate] [Duplicate]',
          doc_count: 300,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 300,
              },
              {
                key: 'rule',
                doc_count: 300,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 300,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'medium',
                doc_count: 300,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['critical users  [Duplicate]'],
          key_as_string: 'critical users  [Duplicate]',
          doc_count: 273,
          hostsCountAggregation: {
            value: 10,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 273,
              },
              {
                key: 'rule',
                doc_count: 273,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 273,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'critical',
                doc_count: 273,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 91,
          },
        },
        {
          key: ['critical users  [Duplicate] [Duplicate]'],
          key_as_string: 'critical users  [Duplicate] [Duplicate]',
          doc_count: 273,
          hostsCountAggregation: {
            value: 10,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 273,
              },
              {
                key: 'rule',
                doc_count: 273,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 273,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'critical',
                doc_count: 273,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 91,
          },
        },
        {
          key: ['high users  [Duplicate]'],
          key_as_string: 'high users  [Duplicate]',
          doc_count: 273,
          hostsCountAggregation: {
            value: 10,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 273,
              },
              {
                key: 'rule',
                doc_count: 273,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 273,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'high',
                doc_count: 273,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 91,
          },
        },
        {
          key: ['high users  [Duplicate] [Duplicate]'],
          key_as_string: 'high users  [Duplicate] [Duplicate]',
          doc_count: 273,
          hostsCountAggregation: {
            value: 10,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 273,
              },
              {
                key: 'rule',
                doc_count: 273,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 273,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'high',
                doc_count: 273,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 91,
          },
        },
        {
          key: ['low users [Duplicate]'],
          key_as_string: 'low users [Duplicate]',
          doc_count: 273,
          hostsCountAggregation: {
            value: 10,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 273,
              },
              {
                key: 'rule',
                doc_count: 273,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 273,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 273,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 91,
          },
        },
        {
          key: ['low users [Duplicate] [Duplicate]'],
          key_as_string: 'low users [Duplicate] [Duplicate]',
          doc_count: 273,
          hostsCountAggregation: {
            value: 10,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 273,
              },
              {
                key: 'rule',
                doc_count: 273,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 273,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 273,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 91,
          },
        },
        {
          key: ['medium users [Duplicate]'],
          key_as_string: 'medium users [Duplicate]',
          doc_count: 273,
          hostsCountAggregation: {
            value: 10,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 273,
              },
              {
                key: 'rule',
                doc_count: 273,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 273,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'medium',
                doc_count: 273,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 91,
          },
        },
        {
          key: ['medium users [Duplicate] [Duplicate]'],
          key_as_string: 'medium users [Duplicate] [Duplicate]',
          doc_count: 273,
          hostsCountAggregation: {
            value: 10,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 273,
              },
              {
                key: 'rule',
                doc_count: 273,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 273,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'medium',
                doc_count: 273,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 91,
          },
        },
        {
          key: ['critical hosts'],
          key_as_string: 'critical hosts',
          doc_count: 100,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 100,
              },
              {
                key: 'rule',
                doc_count: 100,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 100,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'critical',
                doc_count: 100,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['critical hosts [Duplicate] [Duplicate] [Duplicate]'],
          key_as_string: 'critical hosts [Duplicate] [Duplicate] [Duplicate]',
          doc_count: 100,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 100,
              },
              {
                key: 'rule',
                doc_count: 100,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 100,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'critical',
                doc_count: 100,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['high hosts'],
          key_as_string: 'high hosts',
          doc_count: 100,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 100,
              },
              {
                key: 'rule',
                doc_count: 100,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 100,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'high',
                doc_count: 100,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['high hosts [Duplicate] [Duplicate] [Duplicate]'],
          key_as_string: 'high hosts [Duplicate] [Duplicate] [Duplicate]',
          doc_count: 100,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 100,
              },
              {
                key: 'rule',
                doc_count: 100,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 100,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'high',
                doc_count: 100,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['low hosts '],
          key_as_string: 'low hosts ',
          doc_count: 100,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 100,
              },
              {
                key: 'rule',
                doc_count: 100,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 100,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 100,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['low hosts  [Duplicate] [Duplicate] [Duplicate]'],
          key_as_string: 'low hosts  [Duplicate] [Duplicate] [Duplicate]',
          doc_count: 100,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 100,
              },
              {
                key: 'rule',
                doc_count: 100,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 100,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 100,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['medium hosts'],
          key_as_string: 'medium hosts',
          doc_count: 100,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 100,
              },
              {
                key: 'rule',
                doc_count: 100,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 100,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'medium',
                doc_count: 100,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['medium hosts [Duplicate] [Duplicate] [Duplicate]'],
          key_as_string: 'medium hosts [Duplicate] [Duplicate] [Duplicate]',
          doc_count: 100,
          hostsCountAggregation: {
            value: 30,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 100,
              },
              {
                key: 'rule',
                doc_count: 100,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 100,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'medium',
                doc_count: 100,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 0,
          },
        },
        {
          key: ['critical users  [Duplicate] [Duplicate] [Duplicate]'],
          key_as_string: 'critical users  [Duplicate] [Duplicate] [Duplicate]',
          doc_count: 91,
          hostsCountAggregation: {
            value: 10,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cool',
                doc_count: 91,
              },
              {
                key: 'rule',
                doc_count: 91,
              },
            ],
          },
          description: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'f',
                doc_count: 1,
              },
            ],
          },
          unitsCount: {
            value: 91,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'critical',
                doc_count: 91,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 91,
          },
        },
      ],
    },
    description: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'f',
          doc_count: 1,
        },
      ],
    },
    unitsCount: {
      value: 6048,
    },
  },
};
