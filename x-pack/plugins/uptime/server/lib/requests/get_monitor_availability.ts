/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { GetMonitorAvailabilityParams, Ping } from '../../../common/runtime_types';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { AfterKey } from './get_monitor_status';
import { UNNAMED_LOCATION } from '../../../common/constants';

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
    location: key.location === null ? UNNAMED_LOCATION : (key.location as string),
    monitorInfo: fields?.hits?.hits?.[0]?._source,
    up: up_sum.value,
    down: down_sum.value,
    availabilityRatio: ratio.value,
  }));

export const getMonitorAvailability: UMElasticsearchQueryFn<
  GetMonitorAvailabilityParams,
  GetMonitorAvailabilityResult[]
> = async ({ uptimeEsClient, range, rangeUnit, threshold: thresholdString, filters }) => {
  const queryResults: Array<Promise<GetMonitorAvailabilityResult[]>> = [];
  let afterKey: AfterKey;

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
    const esParams = {
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: 'summary',
              },
            },
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
            ...(afterKey ? { after: afterKey } : {}),
            sources: asMutableArray([
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
            ] as const),
          },
          aggs: {
            fields: {
              top_hits: {
                size: 1,
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc' as const,
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
    };

    const { body: result } = await uptimeEsClient.search({ body: esParams });
    afterKey = result?.aggregations?.monitors?.after_key as AfterKey;
    queryResults.push(formatBuckets(result?.aggregations?.monitors?.buckets || []));
  } while (afterKey !== undefined);

  return (await Promise.all(queryResults)).reduce((acc, cur) => acc.concat(cur), []);
};
