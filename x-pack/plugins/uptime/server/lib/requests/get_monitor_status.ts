/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { INDEX_NAMES } from '../../../../../legacy/plugins/uptime/common/constants';

export interface GetMonitorStatusParams {
  filters?: string;
  locations: string[];
  numTimes: number;
  timerange: { from: string; to: string };
}

export interface GetMonitorStatusResult {
  monitor_id: string;
  status: string;
  location: string;
  count: number;
}

interface MonitorStatusKey {
  monitor_id: string;
  status: string;
  location: string;
}

const formatBuckets = async (
  buckets: any[],
  numTimes: number
): Promise<GetMonitorStatusResult[]> => {
  return buckets
    .filter((monitor: any) => monitor?.doc_count > numTimes)
    .map(({ key, doc_count }: any) => ({ ...key, count: doc_count }));
};

const getLocationClause = (locations: string[]) => ({
  bool: {
    should: [
      ...locations.map(location => ({
        term: {
          'observer.geo.name': location,
        },
      })),
    ],
  },
});

export const getMonitorStatus: UMElasticsearchQueryFn<
  GetMonitorStatusParams,
  GetMonitorStatusResult[]
> = async ({ callES, filters, locations, numTimes, timerange: { from: gte, to: lte } }) => {
  const queryResults: Array<Promise<GetMonitorStatusResult[]>> = [];
  let afterKey: MonitorStatusKey | undefined;

  do {
    // today this value is hardcoded. In the future we may support
    // multiple status types for this alert, and this will become a parameter
    const STATUS = 'down';
    const esParams = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  'monitor.status': STATUS,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte,
                    lte,
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
                  monitor_id: {
                    terms: {
                      field: 'monitor.id',
                    },
                  },
                },
                {
                  status: {
                    terms: {
                      field: 'monitor.status',
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
          },
        },
      },
    };
    if (filters) {
      // console.log(JSON.stringify(JSON.parse(filters), null, 2));
      const parsedFilters = JSON.parse(filters);
      esParams.body.query.bool = Object.assign({}, esParams.body.query.bool, parsedFilters.bool);
    }
    if (locations.length) {
      // @ts-ignore this type of addition does not work with TS's type inference
      esParams.body.query.bool.filter.push(getLocationClause(locations));
    }
    if (afterKey) {
      // @ts-ignore the `after` defined here is not available
      // on the inferred type, so TS says it's an error
      esParams.body.aggs.monitors.composite.after = afterKey;
    }
    const result = await callES('search', esParams);
    afterKey = result?.aggregations?.monitors?.after_key;
    queryResults.push(formatBuckets(result?.aggregations?.monitors?.buckets || [], numTimes));
  } while (afterKey !== undefined);
  return (await Promise.all(queryResults)).reduce((acc, cur) => acc.concat(cur), []);
};
