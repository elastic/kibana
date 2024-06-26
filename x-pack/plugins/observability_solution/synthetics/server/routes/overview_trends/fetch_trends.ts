/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UptimeEsClient } from '../../lib';

export function fetchTrends(configId: string, locationIds: string[], esClient: UptimeEsClient) {
  const query = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            bool: {
              filter: [
                {
                  exists: {
                    field: 'summary',
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          should: [
                            {
                              match: {
                                'summary.final_attempt': true,
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        bool: {
                          must_not: {
                            bool: {
                              should: [
                                {
                                  exists: {
                                    field: 'summary.final_attempt',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          {
            bool: {
              must_not: {
                exists: {
                  field: 'run_once',
                },
              },
            },
          },
          {
            terms: {
              'observer.name': locationIds,
            },
          },
          {
            term: {
              config_id: configId,
            },
          },
          {
            range: {
              '@timestamp': {
                gte: 'now-9h',
                lte: 'now',
              },
            },
          },
        ],
      },
    },
    aggs: {
      by_id: {
        terms: {
          field: 'config_id',
        },
        aggs: {
          by_location: {
            terms: {
              field: 'observer.name',
            },
            aggs: {
              last_50: {
                top_hits: {
                  size: 50,
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                },
              },
              stats: {
                stats: {
                  field: 'monitor.duration.us',
                },
              },
              median: {
                percentiles: {
                  field: 'monitor.duration.us',
                  percents: [50],
                },
              },
            },
          },
        },
      },
    },
    _source: false,
    sort: [
      {
        '@timestamp': 'desc',
      },
    ],
    fields: ['monitor.duration.us'],
  };
  console.log(JSON.stringify(query));
  return esClient.search({ body: query });
}
