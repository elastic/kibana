/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { UMElasticsearchQueryFn } from '../adapters';
import { Ping } from '../../../common/runtime_types/ping';

export interface GetMonitorStatusParams {
  filters?: JsonObject;
  locations: string[];
  numTimes: number;
  timespanRange: { from: string; to: string };
  timestampRange: { from: string | number; to: string };
}

export interface GetMonitorStatusResult {
  monitorId: string;
  status: string;
  location: string;
  count: number;
  monitorInfo: Ping;
}

const getLocationClause = (locations: string[]) => ({
  bool: {
    should: [
      ...locations.map((location) => ({
        term: {
          'observer.geo.name': location,
        },
      })),
    ],
  },
});

export type AfterKey = Record<string, string | number | null> | undefined;

export const getMonitorStatus: UMElasticsearchQueryFn<
  GetMonitorStatusParams,
  GetMonitorStatusResult[]
> = async ({ uptimeEsClient, filters, locations, numTimes, timespanRange, timestampRange }) => {
  let afterKey: AfterKey;

  const STATUS = 'down';
  let monitors: any = [];
  do {
    // today this value is hardcoded. In the future we may support
    // multiple status types for this alert, and this will become a parameter
    const esParams = {
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
                  gte: timestampRange.from,
                  lte: timestampRange.to,
                },
              },
            },
            {
              range: {
                'monitor.timespan': {
                  gte: timespanRange.from,
                  lte: timespanRange.to,
                },
              },
            },
            // append user filters, if defined
            ...(filters?.bool ? [filters] : []),
          ] as QueryDslQueryContainer[],
        },
      },
      size: 0,
      aggs: {
        monitors: {
          composite: {
            size: 2000,
            /**
             * We "paginate" results by utilizing the `afterKey` field
             * to tell Elasticsearch where it should start on subsequent queries.
             */
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
            ] as const),
          },
          aggs: {
            fields: {
              top_hits: {
                size: 1,
              },
            },
          },
        },
      },
    };

    /**
     * Perform a logical `and` against the selected location filters.
     */
    if (locations.length) {
      esParams.query.bool.filter.push(getLocationClause(locations));
    }

    const { body: result } = await uptimeEsClient.search({
      body: esParams,
    });

    afterKey = result?.aggregations?.monitors?.after_key as AfterKey;

    monitors = monitors.concat(result?.aggregations?.monitors?.buckets || []);
  } while (afterKey !== undefined);

  return monitors
    .filter((monitor: any) => monitor?.doc_count >= numTimes)
    .map(({ key, doc_count: count, fields }: any) => ({
      ...key,
      count,
      monitorInfo: fields?.hits?.hits?.[0]?._source,
    }));
};
