/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ESSearchResponse,
  ESSearchRequest,
} from '../../../../../typings/elasticsearch';

export const response = ({
  hits: {
    total: 599,
    max_score: 0,
    hits: [],
  },
  took: 4,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  aggregations: {
    user_agent_keys: {
      buckets: [{ key: 'Firefox' }, { key: 'Other' }],
    },
    browsers: {
      buckets: [
        {
          key_as_string: '2019-10-21T04:38:20.000-05:00',
          key: 1571650700000,
          doc_count: 0,
          user_agent: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
        {
          key_as_string: '2019-10-21T04:40:00.000-05:00',
          key: 1571650800000,
          doc_count: 1,
          user_agent: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'Other',
                doc_count: 1,
                avg_duration: {
                  value: 860425.0,
                },
              },
              {
                key: 'Firefox',
                doc_count: 10,
                avg_duration: {
                  value: 86425.1,
                },
              },
            ],
          },
        },
      ],
    },
  },
} as unknown) as ESSearchResponse<
  unknown,
  ESSearchRequest,
  { restTotalHitsAsInt: false }
>;
