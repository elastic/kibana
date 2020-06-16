/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fullyMatchingIds } from '../refine_potential_matches';
import { MonitorLocCheckGroup } from '..';

const mockQueryResult = (opts: { latestSummary: any; latestMatching: any }) => {
  return {
    aggregations: {
      monitor: {
        buckets: [
          {
            key: 'my-monitor',
            location: {
              buckets: [
                {
                  key: 'my-location',
                  summaries: {
                    latest: {
                      hits: {
                        hits: [
                          {
                            _source: opts.latestSummary,
                          },
                        ],
                      },
                    },
                  },
                  latest_matching: {
                    top: {
                      hits: {
                        hits: [
                          {
                            _source: opts.latestMatching,
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  };
};

describe('fully matching IDs', () => {
  it('should exclude items whose latest result does not match', () => {
    const queryRes = mockQueryResult({
      latestSummary: {
        '@timestamp': '2020-06-04T12:39:54.698-0500',
        monitor: {
          check_group: 'latest-summary-check-group',
        },
        summary: {
          up: 1,
          down: 0,
        },
      },
      latestMatching: {
        '@timestamp': '2019-06-04T12:39:54.698-0500',
        summary: {
          up: 1,
          down: 0,
        },
      },
    });
    const res = fullyMatchingIds(queryRes, undefined);
    const expected = new Map<string, MonitorLocCheckGroup[]>();
    expect(res).toEqual(expected);
  });

  it('should include items whose latest result does match', () => {
    const queryRes = mockQueryResult({
      latestSummary: {
        '@timestamp': '2020-06-04T12:39:54.698-0500',
        monitor: {
          check_group: 'latest-summary-check-group',
        },
        summary: {
          up: 1,
          down: 0,
        },
      },
      latestMatching: {
        '@timestamp': '2020-06-04T12:39:54.698-0500',
        summary: {
          up: 1,
          down: 0,
        },
      },
    });
    const res = fullyMatchingIds(queryRes, undefined);
    const expected = new Map<string, MonitorLocCheckGroup[]>();
    expected.set('my-monitor', [
      {
        checkGroup: 'latest-summary-check-group',
        location: 'my-location',
        monitorId: 'my-monitor',
        status: 'up',
        summaryTimestamp: new Date('2020-06-04T12:39:54.698-0500'),
      },
    ]);
    expect(res).toEqual(expected);
  });
});
