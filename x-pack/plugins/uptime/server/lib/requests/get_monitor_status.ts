/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { PromiseType } from 'utility-types';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { UMElasticsearchQueryFn } from '../adapters';
import { Ping } from '../../../common/runtime_types/ping';
import { createEsQuery } from '../../../common/utils/es_search';
import { UptimeESClient } from '../lib';
import { UNNAMED_LOCATION } from '../../../common/constants';

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

const executeQueryParams = async ({
  timestampRange,
  timespanRange,
  filters,
  afterKey,
  uptimeEsClient,
  locations,
}: {
  timespanRange: GetMonitorStatusParams['timespanRange'];
  timestampRange: GetMonitorStatusParams['timestampRange'];
  filters: GetMonitorStatusParams['filters'];
  afterKey?: AfterKey;
  uptimeEsClient: UptimeESClient;
  locations: string[];
}) => {
  const queryParams = createEsQuery({
    body: {
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
                'summary.down': {
                  gt: '0',
                },
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
                sort: [{ '@timestamp': 'desc' }],
              },
            },
          },
        },
      },
    },
  });

  /**
   * Perform a logical `and` against the selected location filters.
   */
  if (locations.length) {
    queryParams.body.query.bool.filter.push(getLocationClause(locations));
  }

  const { body: result } = await uptimeEsClient.search<Ping, typeof queryParams>(queryParams);
  const afterKeyRes = result?.aggregations?.monitors?.after_key;

  const monitors = result?.aggregations?.monitors?.buckets || [];

  return { afterKeyRes, monitors };
};

type QueryResponse = PromiseType<ReturnType<typeof executeQueryParams>>;

export const getMonitorStatus: UMElasticsearchQueryFn<
  GetMonitorStatusParams,
  GetMonitorStatusResult[]
> = async ({ uptimeEsClient, filters, locations, numTimes, timespanRange, timestampRange }) => {
  let afterKey: QueryResponse['afterKeyRes'];

  let monitors: QueryResponse['monitors'] = [];

  do {
    // today this value is hardcoded. In the future we may support
    // multiple status types for this alert, and this will become a parameter

    const { afterKeyRes, monitors: monitorRes } = await executeQueryParams({
      afterKey,
      timespanRange,
      timestampRange,
      filters,
      uptimeEsClient,
      locations,
    });

    afterKey = afterKeyRes;

    monitors = monitors.concat(monitorRes);
  } while (afterKey !== undefined);

  return monitors
    .filter((monitor) => monitor?.doc_count >= numTimes)
    .map(({ key, doc_count: count, fields }) => ({
      count,
      monitorId: key.monitorId as string,
      status: key.status as string,
      location: key.location === null ? UNNAMED_LOCATION : (key.location as string),
      monitorInfo: fields?.hits?.hits?.[0]?._source,
    }));
};
