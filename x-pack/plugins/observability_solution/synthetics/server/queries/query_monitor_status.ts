/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import times from 'lodash/times';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { cloneDeep, intersection } from 'lodash';
import { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { MsearchMultisearchBody } from '@elastic/elasticsearch/lib/api/types';

import { isStatusEnabled } from '../../common/runtime_types/monitor_management/alert_config';
import { FINAL_SUMMARY_FILTER } from '../../common/constants/client_defaults';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  OverviewPing,
  OverviewStatus,
  OverviewStatusMetaData,
} from '../../common/runtime_types';
import { createEsParams, SyntheticsEsClient } from '../lib';

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
  'tags',
];

const getStatusQuery = ({
  idSize,
  idsToQuery,
  range,
  monitorLocationIds,
}: {
  idSize: number;
  monitorLocationIds: string[];
  range: { from: string; to: string };
  idsToQuery: string[];
}) => {
  const params = createEsParams({
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            FINAL_SUMMARY_FILTER,
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
                field: 'observer.name',
                size: monitorLocationIds.length || 100,
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

  if (monitorLocationIds.length > 0) {
    params.body.query?.bool?.filter.push({
      terms: {
        'observer.name': monitorLocationIds,
      },
    });
  }
  return params;
};

type StatusQueryParams = ReturnType<typeof getStatusQuery>;
type OverviewStatusResponse = Omit<
  OverviewStatus,
  | 'disabledCount'
  | 'allMonitorsCount'
  | 'disabledMonitorsCount'
  | 'projectMonitorsCount'
  | 'disabledMonitorQueryIds'
  | 'allIds'
>;

export async function queryMonitorStatus({
  esClient,
  monitorLocationIds,
  range,
  monitorQueryIds,
  monitorLocationsMap,
  monitorQueryIdToConfigIdMap,
  monitors,
}: {
  esClient: SyntheticsEsClient;
  monitorLocationIds: string[];
  range: { from: string; to: string };
  monitorQueryIds: string[];
  monitorLocationsMap: Record<string, string[]>;
  monitorQueryIdToConfigIdMap: Record<string, string>;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>>;
}): Promise<OverviewStatusResponse> {
  const idSize = Math.trunc(DEFAULT_MAX_ES_BUCKET_SIZE / monitorLocationIds.length || 1);
  const pageCount = Math.ceil(monitorQueryIds.length / idSize);
  let up = 0;
  let down = 0;
  const upConfigs: Record<string, OverviewStatusMetaData> = {};
  const downConfigs: Record<string, OverviewStatusMetaData> = {};
  const monitorsWithoutData = new Map(Object.entries(cloneDeep(monitorLocationsMap)));
  const pendingConfigs: Record<string, OverviewStatusMetaData> = {};
  const disabledConfigs: Record<string, OverviewStatusMetaData> = {};

  monitors
    .filter((monitor) => !monitor.attributes[ConfigKey.ENABLED])
    .forEach((monitor) => {
      const monitorQueryId = monitor.attributes[ConfigKey.MONITOR_QUERY_ID];
      monitor.attributes[ConfigKey.LOCATIONS]?.forEach((location) => {
        disabledConfigs[`${monitorQueryIdToConfigIdMap[monitorQueryId]}-${location.id}`] = {
          configId: `${monitorQueryIdToConfigIdMap[monitorQueryId]}`,
          monitorQueryId,
          status: 'disabled',
          locationId: location.id,
          locationLabel: location.label,
          ...getMonitorMeta(monitor),
        };
      });
    });

  const queries: MsearchMultisearchBody[] = times(pageCount).map((i) => {
    const idsToQuery = (monitorQueryIds as string[]).slice(i * idSize, i * idSize + idSize);
    return getStatusQuery({
      idSize,
      monitorLocationIds,
      range,
      idsToQuery,
    }).body;
  });

  if (queries.length) {
    const { responses } = await esClient.msearch<StatusQueryParams, OverviewPing>(
      queries,
      'getCurrentStatusOverview'
    );

    responses.forEach((result) => {
      result.aggregations?.id.buckets.forEach(({ location, key: queryId }) => {
        const locationSummaries = location.buckets.map(({ status, key: locationName }) => {
          const ping = status.hits.hits[0]._source;
          return { location: locationName, ping };
        });

        const monitor = monitors.find((m) => m.attributes[ConfigKey.MONITOR_QUERY_ID] === queryId)!;

        // discard any locations that are not in the monitorLocationsMap for the given monitor as well as those which are
        // in monitorLocationsMap but not in listOfLocations
        const monLocations = monitorLocationsMap?.[queryId];
        const monQueriedLocations = intersection(monLocations, monitorLocationIds);
        monQueriedLocations?.forEach((monLocation) => {
          const locationSummary = locationSummaries.find(
            (summary) => summary.location === monLocation
          );

          if (locationSummary) {
            const { ping } = locationSummary;
            const downCount = ping.summary?.down ?? 0;
            const upCount = ping.summary?.up ?? 0;
            const configId = ping.config_id;
            const monitorQueryId = ping.monitor.id;

            const meta = {
              ping,
              configId,
              monitorQueryId,
              locationId: monLocation,
              timestamp: ping['@timestamp'],
              locationLabel: ping.observer.geo!.name!,
              ...getMonitorMeta(monitor),
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
    });
  }

  // identify the remaining monitors without data, to determine pending monitors
  for (const [queryId, locs] of monitorsWithoutData) {
    const monitor = monitors.find((m) => m.attributes[ConfigKey.MONITOR_QUERY_ID] === queryId)!;
    locs.forEach((loc) => {
      pendingConfigs[`${monitorQueryIdToConfigIdMap[queryId]}-${loc}`] = {
        configId: `${monitorQueryIdToConfigIdMap[queryId]}`,
        monitorQueryId: queryId,
        status: 'unknown',
        locationId: loc,
        locationLabel: monitor.attributes[ConfigKey.LOCATIONS]?.find(
          (location) => location.id === loc
        )?.label!,
        name: monitor.attributes[ConfigKey.NAME],
        schedule: monitor.attributes[ConfigKey.SCHEDULE].number,
        tags: monitor.attributes[ConfigKey.TAGS],
        isEnabled: monitor.attributes[ConfigKey.ENABLED],
        type: monitor.attributes[ConfigKey.MONITOR_TYPE],
        projectId: monitor.attributes[ConfigKey.PROJECT_ID],
        isStatusAlertEnabled: isStatusEnabled(monitor.attributes[ConfigKey.ALERT_CONFIG]),
        updated_at: monitor.updated_at,
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
    disabledConfigs,
  };
}

const getMonitorMeta = (monitor: SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>) => {
  return {
    name: monitor.attributes[ConfigKey.NAME],
    schedule: monitor.attributes[ConfigKey.SCHEDULE].number,
    tags: monitor.attributes[ConfigKey.TAGS],
    isEnabled: monitor.attributes[ConfigKey.ENABLED],
    type: monitor.attributes[ConfigKey.MONITOR_TYPE],
    projectId: monitor.attributes[ConfigKey.PROJECT_ID],
    isStatusAlertEnabled: isStatusEnabled(monitor.attributes[ConfigKey.ALERT_CONFIG]),
    updated_at: monitor.updated_at,
    spaceId: monitor.namespaces?.[0],
  };
};
