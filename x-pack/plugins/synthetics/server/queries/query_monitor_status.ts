/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { SUMMARY_FILTER } from '../../common/constants/client_defaults';
import { UptimeEsClient } from '../legacy_uptime/lib/lib';
import { OverviewStatus, OverviewStatusMetaData, Ping } from '../../common/runtime_types';

const DEFAULT_MAX_ES_BUCKET_SIZE = 10000;

export async function queryMonitorStatus(
  esClient: UptimeEsClient,
  listOfLocations: string[],
  range: { from: string | number; to: string },
  ids: string[],
  monitorLocationsMap?: Record<string, string[]>
): Promise<
  Omit<
    OverviewStatus,
    'disabledCount' | 'allMonitorsCount' | 'disabledMonitorsCount' | 'projectMonitorsCount'
  >
> {
  const idSize = Math.trunc(DEFAULT_MAX_ES_BUCKET_SIZE / listOfLocations.length || 1);
  const pageCount = Math.ceil(ids.length / idSize);
  const promises: Array<Promise<any>> = [];
  for (let i = 0; i < pageCount; i++) {
    const params: SearchRequest = {
      size: 0,
      query: {
        bool: {
          filter: [
            SUMMARY_FILTER,
            {
              range: {
                '@timestamp': {
                  // @ts-ignore
                  gte: range.from,
                  // @ts-expect-error can't mix number and string in client definition
                  lte: range.to,
                },
              },
            },
            {
              terms: {
                'monitor.id': (ids as string[]).slice(i * idSize, i * idSize + idSize),
              },
            },
            ...(listOfLocations.length > 0
              ? [
                  {
                    terms: {
                      'observer.geo.name': listOfLocations,
                    },
                  },
                ]
              : []),
          ],
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
                      includes: [
                        '@timestamp',
                        'summary',
                        'monitor',
                        'observer',
                        'config_id',
                        'error',
                        'agent',
                        'url',
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    promises.push(esClient.search({ body: params }, 'getCurrentStatusOverview' + i));
  }
  let up = 0;
  let down = 0;
  const upConfigs: Record<string, OverviewStatusMetaData> = {};
  const downConfigs: Record<string, OverviewStatusMetaData> = {};
  for await (const response of promises) {
    response.body.aggregations?.id.buckets.forEach(
      ({ location, key: queryId }: { location: any; key: string }) => {
        location.buckets.forEach(({ status }: { key: string; status: any }) => {
          const ping = status.hits.hits[0]._source as Ping & { '@timestamp': string };

          const locationName = ping.observer?.geo?.name!;

          const monLocations = monitorLocationsMap?.[queryId];
          if (monLocations && !monLocations.includes(locationName)) {
            // discard any locations that are not in the monitorLocationsMap for the given monitor
            return;
          }

          const downCount = ping.summary?.down ?? 0;
          const upCount = ping.summary?.up ?? 0;
          const configId = ping.config_id!;
          const monitorQueryId = ping.monitor.id;
          if (upCount > 0) {
            up += 1;
            upConfigs[`${configId}-${locationName}`] = {
              ping,
              configId,
              monitorQueryId,
              location: locationName,
              status: 'up',
              timestamp: ping['@timestamp'],
            };
          } else if (downCount > 0) {
            down += 1;
            downConfigs[`${configId}-${locationName}`] = {
              ping,
              configId,
              monitorQueryId,
              location: locationName,
              status: 'down',
              timestamp: ping['@timestamp'],
            };
          }
        });
      }
    );
  }
  return { up, down, upConfigs, downConfigs, enabledIds: ids };
}
