/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sampleDocNoSortId } from '../../signals/__mocks__/es_results';

export const mockThresholdResults = {
  rawResponse: {
    body: {
      is_partial: false,
      is_running: false,
      took: 527,
      timed_out: false,
      hits: {
        total: {
          value: 0,
          relation: 'eq',
        },
        hits: [],
      },
      aggregations: {
        'threshold_0:source.ip': {
          buckets: [
            {
              key: '127.0.0.1',
              doc_count: 5,
              'threshold_1:host.name': {
                buckets: [
                  {
                    key: 'tardigrade',
                    doc_count: 3,
                    top_threshold_hits: {
                      hits: {
                        total: {
                          value: 1,
                          relation: 'eq',
                        },
                        hits: [
                          {
                            ...sampleDocNoSortId(),
                            'host.name': 'tardigrade',
                          },
                        ],
                      },
                    },
                    cardinality_count: {
                      value: 3,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
};
