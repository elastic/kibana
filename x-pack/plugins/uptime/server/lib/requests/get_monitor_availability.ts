/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { GetMonitorAvailabilityParams, Ping } from '../../../common/runtime_types';

export interface AvailabilityKey {
  monitorId: string;
  location: string;
}

export interface GetMonitorAvailabilityResult {
  monitorId: string;
  up: number;
  down: number;
  location: string;
  availabilityRatio: number | null;
  monitorInfo: Ping;
}

export const formatBuckets = async (buckets: any[]): Promise<GetMonitorAvailabilityResult[]> =>
  // eslint-disable-next-line @typescript-eslint/naming-convention
  buckets.map(({ key, fields, up_sum, down_sum, ratio }: any) => ({
    ...key,
    monitorInfo: fields?.hits?.hits?.[0]?._source,
    up: up_sum.value,
    down: down_sum.value,
    availabilityRatio: ratio.value,
  }));

export const getMonitorAvailability: UMElasticsearchQueryFn<
  GetMonitorAvailabilityParams,
  GetMonitorAvailabilityResult[]
> = async ({ callES, dynamicSettings, range, rangeUnit, threshold: thresholdString, filters }) => {
  const queryResults: Array<Promise<GetMonitorAvailabilityResult[]>> = [];
  let afterKey: AvailabilityKey | undefined;

  const threshold = Number(thresholdString) / 100;
  if (threshold <= 0 || threshold > 1.0) {
    throw new Error(
      `Invalid availability threshold value ${thresholdString}. The value must be between 0 and 100`
    );
  }

  const gte = `now-${range}${rangeUnit}`;

  let parsedFilters: any;
  if (filters) {
    parsedFilters = JSON.parse(filters);
  }

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
              // append user filters, if defined
              ...(parsedFilters?.bool ? [parsedFilters] : []),
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
              ],
            },
            aggs: {
              fields: {
                top_hits: {
                  size: 1,
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                },
              },
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
              filtered: {
                bucket_selector: {
                  buckets_path: {
                    threshold: 'ratio.value',
                  },
                  script: `params.threshold < ${threshold}`,
                },
              },
            },
          },
        },
      },
    };

    if (afterKey) {
      esParams.body.aggs.monitors.composite.after = afterKey;
    }

    const { body: result } = await callES.search(esParams);
    afterKey = result?.aggregations?.monitors?.after_key;

    queryResults.push(formatBuckets(result?.aggregations?.monitors?.buckets || []));
  } while (afterKey !== undefined);

  return (await Promise.all(queryResults)).reduce((acc, cur) => acc.concat(cur), []);
};
