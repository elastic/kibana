/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const esResponse = {
  took: 454,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: 23287,
    max_score: 0,
    hits: [],
  },
  aggregations: {
    error_groups: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '63925d00b445cdf4b532dd09d185f5c6',
          doc_count: 7761,
          sample: {
            hits: {
              total: 7761,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-error-2018.04.25',
                  _id: 'qH7C_WIBcmGuKeCHJvvT',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-04-25T17:03:02.296Z',
                    error: {
                      log: {
                        message: 'this is a string',
                      },
                      grouping_key: '63925d00b445cdf4b532dd09d185f5c6',
                    },
                  },
                  sort: [1524675782296],
                },
              ],
            },
          },
        },
        {
          key: '89bb1a1f644c7f4bbe8d1781b5cb5fd5',
          doc_count: 7752,
          sample: {
            hits: {
              total: 7752,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-error-2018.04.25',
                  _id: '_3_D_WIBcmGuKeCHFwOW',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-04-25T17:04:03.504Z',
                    error: {
                      exception: [
                        {
                          handled: true,
                          message: 'foo',
                        },
                      ],
                      culprit: '<anonymous> (server/coffee.js)',
                      grouping_key: '89bb1a1f644c7f4bbe8d1781b5cb5fd5',
                    },
                  },
                  sort: [1524675843504],
                },
              ],
            },
          },
        },
        {
          key: '7a17ea60604e3531bd8de58645b8631f',
          doc_count: 3887,
          sample: {
            hits: {
              total: 3887,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-error-2018.04.25',
                  _id: 'dn_D_WIBcmGuKeCHQgXJ',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-04-25T17:04:14.575Z',
                    error: {
                      exception: [
                        {
                          handled: false,
                          message: 'socket hang up',
                        },
                      ],
                      culprit: 'createHangUpError (_http_client.js)',
                      grouping_key: '7a17ea60604e3531bd8de58645b8631f',
                    },
                  },
                  sort: [1524675854575],
                },
              ],
            },
          },
        },
        {
          key: 'b9e1027f29c221763f864f6fa2ad9f5e',
          doc_count: 3886,
          sample: {
            hits: {
              total: 3886,
              max_score: null,
              hits: [
                {
                  _index: 'apm-7.0.0-alpha1-error-2018.04.25',
                  _id: 'dX_D_WIBcmGuKeCHQgXJ',
                  _score: null,
                  _source: {
                    '@timestamp': '2018-04-25T17:04:14.533Z',
                    error: {
                      exception: [
                        {
                          handled: false,
                          message: 'this will not get captured by express',
                        },
                      ],
                      culprit: '<anonymous> (server/coffee.js)',
                      grouping_key: 'b9e1027f29c221763f864f6fa2ad9f5e',
                    },
                  },
                  sort: [1524675854533],
                },
              ],
            },
          },
        },
      ],
    },
  },
};
