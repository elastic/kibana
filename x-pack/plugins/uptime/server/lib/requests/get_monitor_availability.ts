/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { GetMonitorAvailabilityParams } from '../../../common/runtime_types';

export interface AvailabilityKey {
  monitorId: string;
  location: string;
  name: string;
  url: string;
}

export interface GetMonitorAvailabilityResult {
  monitorId: string;
  location: string;
  name: string;
  url: string;
  up: number;
  down: number;
  availabilityRatio: number | null;
}

export const formatBuckets = async (
  buckets: any[],
  threshold: number
): Promise<GetMonitorAvailabilityResult[]> => {
  return buckets
    .filter((bucket: any) => (100 * bucket?.ratio?.value ?? 1.0) < threshold)
    .map(({ key, up_sum, down_sum, ratio }: any) => ({
      ...key,
      up: up_sum.value,
      down: down_sum.value,
      availabilityRatio: ratio.value,
    }));
};

export const getMonitorAvailability: UMElasticsearchQueryFn<
  GetMonitorAvailabilityParams,
  GetMonitorAvailabilityResult[]
> = async ({ callES, dynamicSettings, range, rangeUnit, threshold, filters }) => {
  const queryResults: Array<Promise<GetMonitorAvailabilityResult[]>> = [];
  let afterKey: AvailabilityKey | undefined;
  const gte = `now-${range}${rangeUnit}`;

  do {
    const esParams: any = {
      index: dynamicSettings.heartbeatIndices,
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte,
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
        size: 0,
        aggs: {
          monitors: {
            composite: {
              size: 2000,
              sources: [
                {
                  monitorId: {
                    terms: {
                      field: 'monitor.id',
                    },
                  },
                },
                {
                  location: {
                    terms: {
                      field: 'observer.geo.name',
                      missing_bucket: true,
                    },
                  },
                },
                {
                  name: {
                    terms: {
                      field: 'monitor.name',
                    },
                  },
                },
                {
                  url: {
                    terms: {
                      field: 'url.full',
                    },
                  },
                },
              ],
            },
            aggs: {
              up_sum: {
                sum: {
                  field: 'summary.up',
                  missing: 0,
                },
              },
              down_sum: {
                sum: {
                  field: 'summary.down',
                  missing: 0,
                },
              },
              ratio: {
                bucket_script: {
                  buckets_path: {
                    upTotal: 'up_sum',
                    downTotal: 'down_sum',
                  },
                  script: `
                if (params.upTotal + params.downTotal > 0) {
                  return params.upTotal / (params.upTotal + params.downTotal);
                } return null;`,
                },
              },
            },
          },
        },
      },
    };

    if (filters) {
      const parsedFilters = JSON.parse(filters);
      esParams.body.query.bool = { ...esParams.body.query.bool, ...parsedFilters.bool };
    }

    if (afterKey) {
      esParams.body.aggs.monitors.composite.after = afterKey;
    }

    const result = await callES('search', esParams);
    afterKey = result?.aggregations?.monitors?.after_key;

    queryResults.push(formatBuckets(result?.aggregations?.monitors?.buckets || [], threshold));
  } while (afterKey !== undefined);

  return (await Promise.all(queryResults)).reduce((acc, cur) => acc.concat(cur), []);
};
