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
          key: ['critical hosts [Duplicate]', 'critical hosts [Duplicate]'],
          key_as_string: 'critical hosts [Duplicate]|critical hosts [Duplicate]',
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
          key: ['critical hosts [Duplicate] [Duplicate]', 'critical hosts [Duplicate] [Duplicate]'],
          key_as_string:
            'critical hosts [Duplicate] [Duplicate]|critical hosts [Duplicate] [Duplicate]',
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
          key: ['high hosts [Duplicate]', 'high hosts [Duplicate]'],
          key_as_string: 'high hosts [Duplicate]|high hosts [Duplicate]',
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
          key: ['high hosts [Duplicate] [Duplicate]', 'high hosts [Duplicate] [Duplicate]'],
          key_as_string: 'high hosts [Duplicate] [Duplicate]|high hosts [Duplicate] [Duplicate]',
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
          key: ['low hosts  [Duplicate]', 'low hosts  [Duplicate]'],
          key_as_string: 'low hosts  [Duplicate]|low hosts  [Duplicate]',
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
          key: ['low hosts  [Duplicate] [Duplicate]', 'low hosts  [Duplicate] [Duplicate]'],
          key_as_string: 'low hosts  [Duplicate] [Duplicate]|low hosts  [Duplicate] [Duplicate]',
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
          key: ['medium hosts [Duplicate]', 'medium hosts [Duplicate]'],
          key_as_string: 'medium hosts [Duplicate]|medium hosts [Duplicate]',
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
          key: ['medium hosts [Duplicate] [Duplicate]', 'medium hosts [Duplicate] [Duplicate]'],
          key_as_string:
            'medium hosts [Duplicate] [Duplicate]|medium hosts [Duplicate] [Duplicate]',
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
          key: ['critical users  [Duplicate]', 'critical users  [Duplicate]'],
          key_as_string: 'critical users  [Duplicate]|critical users  [Duplicate]',
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
          key: [
            'critical users  [Duplicate] [Duplicate]',
            'critical users  [Duplicate] [Duplicate]',
          ],
          key_as_string:
            'critical users  [Duplicate] [Duplicate]|critical users  [Duplicate] [Duplicate]',
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
          key: ['high users  [Duplicate]', 'high users  [Duplicate]'],
          key_as_string: 'high users  [Duplicate]|high users  [Duplicate]',
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
          key: ['high users  [Duplicate] [Duplicate]', 'high users  [Duplicate] [Duplicate]'],
          key_as_string: 'high users  [Duplicate] [Duplicate]|high users  [Duplicate] [Duplicate]',
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
          key: ['low users [Duplicate]', 'low users [Duplicate]'],
          key_as_string: 'low users [Duplicate]|low users [Duplicate]',
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
          key: ['low users [Duplicate] [Duplicate]', 'low users [Duplicate] [Duplicate]'],
          key_as_string: 'low users [Duplicate] [Duplicate]|low users [Duplicate] [Duplicate]',
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
          key: ['medium users [Duplicate]', 'medium users [Duplicate]'],
          key_as_string: 'medium users [Duplicate]|medium users [Duplicate]',
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
          key: ['medium users [Duplicate] [Duplicate]', 'medium users [Duplicate] [Duplicate]'],
          key_as_string:
            'medium users [Duplicate] [Duplicate]|medium users [Duplicate] [Duplicate]',
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
          key: ['critical hosts', 'critical hosts'],
          key_as_string: 'critical hosts|critical hosts',
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
          key: [
            'critical hosts [Duplicate] [Duplicate] [Duplicate]',
            'critical hosts [Duplicate] [Duplicate] [Duplicate]',
          ],
          key_as_string:
            'critical hosts [Duplicate] [Duplicate] [Duplicate]|critical hosts [Duplicate] [Duplicate] [Duplicate]',
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
          key: ['high hosts', 'high hosts'],
          key_as_string: 'high hosts|high hosts',
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
          key: [
            'high hosts [Duplicate] [Duplicate] [Duplicate]',
            'high hosts [Duplicate] [Duplicate] [Duplicate]',
          ],
          key_as_string:
            'high hosts [Duplicate] [Duplicate] [Duplicate]|high hosts [Duplicate] [Duplicate] [Duplicate]',
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
          key: ['low hosts ', 'low hosts '],
          key_as_string: 'low hosts |low hosts ',
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
          key: [
            'low hosts  [Duplicate] [Duplicate] [Duplicate]',
            'low hosts  [Duplicate] [Duplicate] [Duplicate]',
          ],
          key_as_string:
            'low hosts  [Duplicate] [Duplicate] [Duplicate]|low hosts  [Duplicate] [Duplicate] [Duplicate]',
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
          key: ['medium hosts', 'medium hosts'],
          key_as_string: 'medium hosts|medium hosts',
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
          key: [
            'medium hosts [Duplicate] [Duplicate] [Duplicate]',
            'medium hosts [Duplicate] [Duplicate] [Duplicate]',
          ],
          key_as_string:
            'medium hosts [Duplicate] [Duplicate] [Duplicate]|medium hosts [Duplicate] [Duplicate] [Duplicate]',
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
          key: [
            'critical users  [Duplicate] [Duplicate] [Duplicate]',
            'critical users  [Duplicate] [Duplicate] [Duplicate]',
          ],
          key_as_string:
            'critical users  [Duplicate] [Duplicate] [Duplicate]|critical users  [Duplicate] [Duplicate] [Duplicate]',
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
