/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractBeatUsageMetrics } from './fetchers';

describe('extractBeatUsageMetrics', () => {
  it('should not blow when no values are supplied for the aggregations', () => {
    expect(extractBeatUsageMetrics({})).toEqual({
      memory: {
        rss: {},
      },
      cpu: {},
    });
  });

  it('should not blow when some values are missing from the aggregations', () => {
    expect(
      extractBeatUsageMetrics({
        aggregations: {
          lastDay: {
            max_rss: {
              value: 1,
            },
          },
        },
      })
    ).toEqual({
      memory: {
        rss: {
          max: 1,
        },
      },
      cpu: {},
    });
  });

  it('should pick out all the max/avg/latest for memory/cpu', () => {
    expect(
      extractBeatUsageMetrics({
        aggregations: {
          lastDay: {
            max_rss: {
              value: 1,
            },
            avg_rss: {
              value: 1,
            },
            max_cpu: {
              value: 2,
            },
            avg_cpu: {
              value: 2,
            },
            latest: {
              hits: {
                total: 1,
                hits: [
                  {
                    _index: '',
                    _id: '',
                    _source: {
                      monitoring: {
                        metrics: {
                          beat: {
                            cpu: {
                              total: {
                                time: {
                                  ms: 2,
                                },
                              },
                            },
                            memstats: {
                              rss: 1,
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      })
    ).toEqual({
      memory: {
        rss: {
          max: 1,
          avg: 1,
          latest: 1,
        },
      },
      cpu: {
        max: 2,
        avg: 2,
        latest: 2,
      },
    });
  });
});
