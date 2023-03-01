/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { termQuery, termsQuery } from '@kbn/observability-plugin/server';
import { castArray } from 'lodash';

export function apmMlAnomalyQuery({
  partition,
  by,
}: {
  partition?: string | string[];
  by?: string | string[];
}) {
  return [
    {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  bool: {
                    filter: [
                      ...termQuery('is_interim', false),
                      ...termQuery('result_type', 'record'),
                    ],
                  },
                },
                {
                  bool: {
                    filter: termQuery('result_type', 'model_plot'),
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          ...(partition && partition.length
            ? termsQuery('partition_field_value', ...castArray(partition))
            : []),
          ...(by && by.length
            ? termsQuery('by_field_value', ...castArray(by))
            : []),
        ],
      },
    },
  ] as QueryDslQueryContainer[];
}
