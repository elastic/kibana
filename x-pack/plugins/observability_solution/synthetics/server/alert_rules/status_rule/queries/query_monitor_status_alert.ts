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
import { FINAL_SUMMARY_FILTER, getRangeFilter } from '../../../../common/constants/client_defaults';
import { OverviewPendingStatusMetaData, OverviewPing } from '../../../../common/runtime_types';
import { createEsParams, SyntheticsEsClient } from '../../../lib';

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

export interface AlertStatusMetaDataCodec {
  monitorQueryId: string;
  configId: string;
  status?: string;
  locationId: string;
  timestamp: string;
  ping: OverviewPing;
  checks: {
    total: number;
    down: number;
  };
}

export type StatusConfigs = Record<string, AlertStatusMetaDataCodec>;

export interface AlertStatusResponse {
  upConfigs: StatusConfigs;
  downConfigs: StatusConfigs;
  pendingConfigs: Record<string, OverviewPendingStatusMetaData>;
  enabledMonitorQueryIds: string[];
}

export async function queryMonitorStatusAlert(
  esClient: SyntheticsEsClient,
  monitorLocationIds: string[],
  range: { from: string; to: string },
  monitorQueryIds: string[],
  monitorLocationsMap: Record<string, string[]>,
  monitorQueryIdToConfigIdMap: Record<string, string>,
  numberOfChecks: number
): Promise<AlertStatusResponse> {
  const idSize = Math.trunc(DEFAULT_MAX_ES_BUCKET_SIZE / monitorLocationIds.length || 1);
  const pageCount = Math.ceil(monitorQueryIds.length / idSize);
  let up = 0;
  let down = 0;
  const upConfigs: StatusConfigs = {};
  const downConfigs: StatusConfigs = {};
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
                FINAL_SUMMARY_FILTER,
                getRangeFilter({ from: range.from, to: range.to }),
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
                    field: 'observer.name',
                    size: monitorLocationIds.length || 100,
                  },
                  aggs: {
                    downChecks: {
                      filter: {
                        range: {
                          'summary.down': {
                            gte: '1',
                          },
                        },
                      },
                    },
                    totalChecks: {
                      top_hits: {
                        size: numberOfChecks,
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

      if (monitorLocationIds.length > 0) {
        params.body.query.bool.filter.push({
          terms: {
            'observer.name': monitorLocationIds,
          },
        });
      }

      const { body: result } = await esClient.search<OverviewPing, typeof params>(params);

      result.aggregations?.id.buckets.forEach(({ location, key: queryId }) => {
        const locationSummaries = location.buckets.map(
          ({ key: locationId, totalChecks, downChecks }) => {
            return { locationId, totalChecks, downChecks };
          }
        );

        // discard any locations that are not in the monitorLocationsMap for the given monitor as well as those which are
        // in monitorLocationsMap but not in listOfLocations
        const monLocations = monitorLocationsMap?.[queryId];
        const monQueriedLocations = intersection(monLocations, monitorLocationIds);
        monQueriedLocations?.forEach((monLocationId) => {
          const locationSummary = locationSummaries.find(
            (summary) => summary.locationId === monLocationId
          );

          if (locationSummary) {
            const { totalChecks, downChecks } = locationSummary;
            const firstPing = totalChecks.hits.hits[0]._source;
            const downCount = downChecks.doc_count;
            const upCount = firstPing.summary?.up ?? 0;
            const configId = firstPing.config_id;
            const monitorQueryId = firstPing.monitor.id;

            const meta: AlertStatusMetaDataCodec = {
              ping: firstPing,
              configId,
              monitorQueryId,
              locationId: monLocationId,
              timestamp: firstPing['@timestamp'],
              checks: {
                total: totalChecks.hits.hits.length,
                down: totalChecks.hits.hits.reduce(
                  (acc, curr) => acc + ((curr._source.summary.down ?? 0) > 0 ? 1 : 0),
                  0
                ),
              },
            };

            if (downCount > 0) {
              down += 1;
              downConfigs[`${configId}-${monLocationId}`] = {
                ...meta,
                status: 'down',
              };
            } else if (upCount > 0) {
              up += 1;
              upConfigs[`${configId}-${monLocationId}`] = {
                ...meta,
                status: 'up',
              };
            }

            const monitorsMissingData = monitorsWithoutData.get(monitorQueryId) || [];
            monitorsWithoutData.set(
              monitorQueryId,
              monitorsMissingData?.filter((loc) => loc !== monLocationId)
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
        locationId: loc,
      };
    });
  }

  return {
    upConfigs,
    downConfigs,
    pendingConfigs,
    enabledMonitorQueryIds: monitorQueryIds,
  };
}
