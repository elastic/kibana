/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import times from 'lodash/times';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { cloneDeep, intersection } from 'lodash';
import { SUMMARY_FILTER } from '../../common/constants/client_defaults';
import { createEsParams, UptimeEsClient } from '../legacy_uptime/lib/lib';
import {
  OverviewPendingStatusMetaData,
  OverviewPing,
  OverviewStatus,
  OverviewStatusMetaData,
} from '../../common/runtime_types';

const DEFAULT_MAX_ES_BUCKET_SIZE = 10000;

const fields = [
  '@timestamp',
  'summary',
  'monitor',
  'observer',
  'config_id',
  'error',
  'agent',
  'url',
  'state',
];

export async function queryMonitorStatus(
  esClient: UptimeEsClient,
  listOfLocations: string[],
  range: { from: string; to: string },
  monitorQueryIds: string[],
  monitorLocationsMap: Record<string, string[]>,
  monitorQueryIdToConfigIdMap: Record<string, string>
): Promise<
  Omit<
    OverviewStatus,
    | 'disabledCount'
    | 'allMonitorsCount'
    | 'disabledMonitorsCount'
    | 'projectMonitorsCount'
    | 'disabledMonitorQueryIds'
    | 'allIds'
  >
> {
  const idSize = Math.trunc(DEFAULT_MAX_ES_BUCKET_SIZE / listOfLocations.length || 1);
  const pageCount = Math.ceil(monitorQueryIds.length / idSize);
  let up = 0;
  let down = 0;
  const upConfigs: Record<string, OverviewStatusMetaData> = {};
  const downConfigs: Record<string, OverviewStatusMetaData> = {};
  const monitorsWithoutData = new Map(Object.entries(cloneDeep(monitorLocationsMap)));
  const pendingConfigs: Record<string, OverviewPendingStatusMetaData> = {};

  await pMap(
    times(pageCount),
    async (i) => {
      const idsToQuery = (monitorQueryIds as string[]).slice(i * idSize, i * idSize + idSize);
      const params = createEsParams({
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                SUMMARY_FILTER,
                {
                  range: {
                    '@timestamp': {
                      gte: range.from,
                      lte: range.to,
                    },
                  },
                },
                {
                  terms: {
                    'monitor.id': idsToQuery,
                  },
                },
              ] as QueryDslQueryContainer[],
            },
          },
          aggs: {
            id: {
              terms: {
                field: 'monitor.id',
                size: idSize,
              },
              aggs: {
                location: {
                  terms: {
                    field: 'observer.geo.name',
                    size: listOfLocations.length || 100,
                  },
                  aggs: {
                    status: {
                      top_hits: {
                        size: 1,
                        sort: [
                          {
                            '@timestamp': {
                              order: 'desc',
                            },
                          },
                        ],
                        _source: {
                          includes: fields,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (listOfLocations.length > 0) {
        params.body.query.bool.filter.push({
          terms: {
            'observer.geo.name': listOfLocations,
          },
        });
      }

      const { body: result } = await esClient.search<OverviewPing, typeof params>(
        params,
        'getCurrentStatusOverview' + i
      );

      result.aggregations?.id.buckets.forEach(({ location, key: queryId }) => {
        const locationSummaries = location.buckets.map(({ status, key: locationName }) => {
          const ping = status.hits.hits[0]._source;
          return { location: locationName, ping };
        });

        // discard any locations that are not in the monitorLocationsMap for the given monitor as well as those which are
        // in monitorLocationsMap but not in listOfLocations
        const monLocations = monitorLocationsMap?.[queryId];
        const monQueriedLocations = intersection(monLocations, listOfLocations);
        monQueriedLocations?.forEach((monLocation) => {
          const locationSummary = locationSummaries.find(
            (summary) => summary.location === monLocation
          );

          if (locationSummary) {
            const { ping } = locationSummary;
            const downCount = ping.summary?.down ?? 0;
            const upCount = ping.summary?.up ?? 0;
            const configId = ping.config_id!;
            const monitorQueryId = ping.monitor.id;

            const meta = {
              ping,
              configId,
              monitorQueryId,
              location: monLocation,
              timestamp: ping['@timestamp'],
            };

            if (downCount > 0) {
              down += 1;
              downConfigs[`${configId}-${monLocation}`] = {
                ...meta,
                status: 'down',
              };
            } else if (upCount > 0) {
              up += 1;
              upConfigs[`${configId}-${monLocation}`] = {
                ...meta,
                status: 'up',
              };
            }
            const monitorsMissingData = monitorsWithoutData.get(monitorQueryId) || [];
            monitorsWithoutData.set(
              monitorQueryId,
              monitorsMissingData?.filter((loc) => loc !== monLocation)
            );
            if (!monitorsWithoutData.get(monitorQueryId)?.length) {
              monitorsWithoutData.delete(monitorQueryId);
            }
          }
        });
      });
    },
    { concurrency: 5 }
  );

  // identify the remaining monitors without data, to determine pending monitors
  for (const [queryId, locs] of monitorsWithoutData) {
    locs.forEach((loc) => {
      pendingConfigs[`${monitorQueryIdToConfigIdMap[queryId]}-${loc}`] = {
        configId: `${monitorQueryIdToConfigIdMap[queryId]}`,
        monitorQueryId: queryId,
        status: 'unknown',
        location: loc,
      };
    });
  }

  return {
    up,
    down,
    pending: Object.values(pendingConfigs).length,
    upConfigs,
    downConfigs,
    pendingConfigs,
    enabledMonitorQueryIds: monitorQueryIds,
  };
}
