/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAlertSearchResponse } from '../../../../common/components/alerts_treemap/lib/mocks/mock_alert_search_response';

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
          key: ['critical hosts [Duplicate]', 'f'],
          key_as_string: 'critical hosts [Duplicate]|f',
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
          key: ['critical hosts [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'critical hosts [Duplicate] [Duplicate]|f',
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
          key: ['high hosts [Duplicate]', 'f'],
          key_as_string: 'high hosts [Duplicate]|f',
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
          key: ['high hosts [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'high hosts [Duplicate] [Duplicate]|f',
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
          key: ['low hosts  [Duplicate]', 'f'],
          key_as_string: 'low hosts  [Duplicate]|f',
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
          key: ['low hosts  [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'low hosts  [Duplicate] [Duplicate]|f',
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
          key: ['medium hosts [Duplicate]', 'f'],
          key_as_string: 'medium hosts [Duplicate]|f',
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
          key: ['medium hosts [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'medium hosts [Duplicate] [Duplicate]|f',
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
          key: ['critical users  [Duplicate]', 'f'],
          key_as_string: 'critical users  [Duplicate]|f',
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
          key: ['critical users  [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'critical users  [Duplicate] [Duplicate]|f',
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
          key: ['high users  [Duplicate]', 'f'],
          key_as_string: 'high users  [Duplicate]|f',
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
          key: ['high users  [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'high users  [Duplicate] [Duplicate]|f',
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
          key: ['low users [Duplicate]', 'f'],
          key_as_string: 'low users [Duplicate]|f',
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
          key: ['low users [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'low users [Duplicate] [Duplicate]|f',
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
          key: ['medium users [Duplicate]', 'f'],
          key_as_string: 'medium users [Duplicate]|f',
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
          key: ['medium users [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'medium users [Duplicate] [Duplicate]|f',
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
          key: ['critical hosts', 'f'],
          key_as_string: 'critical hosts|f',
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
          key: ['critical hosts [Duplicate] [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'critical hosts [Duplicate] [Duplicate] [Duplicate]|f',
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
          key: ['high hosts', 'f'],
          key_as_string: 'high hosts|f',
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
          key: ['high hosts [Duplicate] [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'high hosts [Duplicate] [Duplicate] [Duplicate]|f',
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
          key: ['low hosts ', 'f'],
          key_as_string: 'low hosts |f',
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
          key: ['low hosts  [Duplicate] [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'low hosts  [Duplicate] [Duplicate] [Duplicate]|f',
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
          key: ['medium hosts', 'f'],
          key_as_string: 'medium hosts|f',
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
          key: ['medium hosts [Duplicate] [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'medium hosts [Duplicate] [Duplicate] [Duplicate]|f',
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
          key: ['critical users  [Duplicate] [Duplicate] [Duplicate]', 'f'],
          key_as_string: 'critical users  [Duplicate] [Duplicate] [Duplicate]|f',
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
    unitsCount: {
      value: 6048,
    },
  },
};
