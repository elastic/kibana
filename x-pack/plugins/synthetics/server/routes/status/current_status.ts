/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import datemath, { Unit } from '@kbn/datemath';
import { IKibanaResponse, SavedObjectsClientContract } from '@kbn/core/server';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { getMonitors } from '../common';
import { UptimeEsClient } from '../../legacy_uptime/lib/lib';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { ConfigKey, OverviewStatus, OverviewStatusMetaData } from '../../../common/runtime_types';

/**
 * Helper function that converts a monitor's schedule to a value to use to generate
 * an appropriate look-back window for snapshot count.
 * @param schedule a number/unit pair that represents how often a configured monitor runs
 * @returns schedule interval in ms
 */
export function periodToMs(schedule: { number: string; unit: Unit }) {
  if (Object.keys(datemath.unitsMap).indexOf(schedule.unit) === -1) return 0;

  return parseInt(schedule.number, 10) * datemath.unitsMap[schedule.unit].base;
}

const DEFAULT_MAX_ES_BUCKET_SIZE = 10000;

export async function queryMonitorStatus(
  esClient: UptimeEsClient,
  maxLocations: number,
  maxPeriod: number,
  ids: Array<string | undefined>
): Promise<Omit<OverviewStatus, 'disabledCount'>> {
  const idSize = Math.trunc(DEFAULT_MAX_ES_BUCKET_SIZE / maxLocations);
  const pageCount = Math.ceil(ids.length / idSize);
  const promises: Array<Promise<any>> = [];
  for (let i = 0; i < pageCount; i++) {
    const params: estypes.SearchRequest = {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: maxPeriod,
                  // @ts-expect-error can't mix number and string in client definition
                  lte: 'now',
                },
              },
            },
            {
              terms: {
                'monitor.id': (ids as string[]).slice(i * idSize, i * idSize + idSize),
              },
            },
            {
              exists: {
                field: 'summary',
              },
            },
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
                size: maxLocations,
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
                      includes: ['@timestamp', 'summary'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    promises.push(esClient.baseESClient.search(params));
  }
  let up = 0;
  let down = 0;
  const upConfigs: OverviewStatusMetaData[] = [];
  const downConfigs: OverviewStatusMetaData[] = [];
  for await (const response of promises) {
    response.aggregations?.id.buckets.forEach(({ location }: { key: string; location: any }) => {
      location.buckets.forEach(({ status }: { key: string; status: any }) => {
        const downCount = status.hits.hits[0]._source.summary.down;
        const upCount = status.hits.hits[0]._source.summary.up;
        const configId = status.hits.hits[0]._source.config_id;
        const heartbeatId = status.hits.hits[0]._source.monitor.id;
        const locationName = status.hits.hits[0]._source.observer.geo.name;
        if (upCount > 0) {
          up += 1;
          upConfigs.push({
            configId,
            heartbeatId,
            location: locationName,
          });
        } else if (downCount > 0) {
          down += 1;
          downConfigs.push({
            configId,
            heartbeatId,
            location: locationName,
          });
        }
      });
    });
  }
  return { up, down, upConfigs, downConfigs };
}

/**
 * Multi-stage function that first queries all the user's saved object monitor configs.
 *
 * Subsequently, fetch the status for each monitor per location in the data streams.
 * @returns The counts of up/down/disabled monitor by location, and a map of each monitor:location status.
 */
export async function getStatus(
  uptimeEsClient: UptimeEsClient,
  savedObjectsClient: SavedObjectsClientContract,
  syntheticsMonitorClient: SyntheticsMonitorClient
) {
  let monitors;
  const enabledIds: Array<string | undefined> = [];
  let disabledCount = 0;
  let page = 1;
  let maxPeriod = 0;
  let maxLocations = 1;
  /**
   * Walk through all monitor saved objects, bucket IDs by disabled/enabled status.
   *
   * Track max period to make sure the snapshot query should reach back far enough to catch
   * latest ping for all enabled monitors.
   */
  do {
    monitors = await getMonitors(
      {
        perPage: 500,
        page,
        sortField: 'name.keyword',
        sortOrder: 'asc',
      },
      syntheticsMonitorClient.syntheticsService,
      savedObjectsClient
    );
    page++;
    monitors.saved_objects.forEach((monitor) => {
      if (monitor.attributes[ConfigKey.ENABLED] === false) {
        disabledCount += monitor.attributes[ConfigKey.LOCATIONS].length;
      } else {
        enabledIds.push(monitor.attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] || monitor.id);
        maxLocations = Math.max(maxLocations, monitor.attributes.locations.length);
        maxPeriod = Math.max(maxPeriod, periodToMs(monitor.attributes.schedule));
      }
    });
  } while (monitors.saved_objects.length === monitors.per_page);

  const { up, down, upConfigs, downConfigs } = await queryMonitorStatus(
    uptimeEsClient,
    maxLocations,
    maxPeriod,
    enabledIds
  );

  return {
    disabledCount,
    up,
    down,
    upConfigs,
    downConfigs,
  };
}

export const createGetCurrentStatusRoute: SyntheticsRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.OVERVIEW_STATUS,
  validate: {
    query: schema.object({}),
  },
  handler: async ({
    uptimeEsClient,
    savedObjectsClient,
    syntheticsMonitorClient,
    response,
  }): Promise<IKibanaResponse<OverviewStatus>> => {
    return response.ok({
      body: await getStatus(uptimeEsClient, savedObjectsClient, syntheticsMonitorClient),
    });
  },
});
