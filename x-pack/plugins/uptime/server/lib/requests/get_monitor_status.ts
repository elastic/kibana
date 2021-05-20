/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from 'src/plugins/kibana_utils/public';
import { QueryContainer } from '@elastic/elasticsearch/api/types';
import { PromiseType } from 'utility-types';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { Ping } from '../../../common/runtime_types/ping';
import { createEsQuery, UptimeESClient } from '../lib';

export type GetMonitorStatusParams = {
  filters?: JsonObject;
  locations: string[];
  numTimes: number;
  timerange: { from: string; to: string };
  status?: string;
} & { uptimeEsClient: UptimeESClient };

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

export type GetMonitorStatusResult = PromiseType<ReturnType<typeof getMonitorStatus>>;

export const getMonitorStatus = async ({
  uptimeEsClient,
  filters,
  locations,
  numTimes,
  timerange: { from, to },
  status = 'down',
}: GetMonitorStatusParams) => {
  let afterKey: AfterKey;

  const getListOfMonitors = async () => {
    const esParams = createEsQuery({
      query: {
        bool: {
          filter: [
            {
              term: {
                'monitor.status': status,
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: from,
                  lte: to,
                },
              },
            },
            // append user filters, if defined
            ...(filters?.bool ? [filters] : []),
          ] as QueryContainer[],
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
    });

    /**
     * Perform a logical `and` against the selected location filters.
     */
    if (locations.length) {
      esParams.query.bool.filter.push(getLocationClause(locations));
    }

    const { body: result } = await uptimeEsClient.search({
      body: esParams,
    });

    const afterKeyN = result?.aggregations?.monitors?.after_key;
    return { monitors: result?.aggregations?.monitors?.buckets || [], afterKey: afterKeyN };
  };

  const result = await getListOfMonitors();
  afterKey = result.afterKey;

  const allMonitors = result.monitors;

  while (afterKey !== undefined) {
    const { monitors: moreMonitors, afterKey: afterKeyT } = await getListOfMonitors();
    afterKey = afterKeyT;
    allMonitors.concat(moreMonitors);
  }

  return allMonitors
    .filter((monitor: any) => monitor?.doc_count >= numTimes)
    .map(({ key, doc_count: count, fields }) => ({
      ...key,
      count,
      monitorInfo: fields?.hits?.hits?.[0]?._source as Ping,
    }));
};
