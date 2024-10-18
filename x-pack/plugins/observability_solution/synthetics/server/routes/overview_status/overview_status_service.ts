/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { asMutableArray } from '@kbn/uptime-plugin/common/utils/as_mutable_array';
import { isEmpty } from 'lodash';
import { withApmSpan } from '@kbn/apm-data-access-plugin/server/utils/with_apm_span';
import { getMonitorFilters, OverviewStatusQuery } from '../common';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { ConfigKey } from '../../../common/constants/monitor_management';
import { RouteContext } from '../types';
import {
  EncryptedSyntheticsMonitorAttributes,
  OverviewStatusMetaData,
} from '../../../common/runtime_types';
import { isStatusEnabled } from '../../../common/runtime_types/monitor_management/alert_config';
import {
  FINAL_SUMMARY_FILTER,
  getRangeFilter,
  getTimespanFilter,
} from '../../../common/constants/client_defaults';

type LocationStatus = Array<{
  status: string;
  locationId: string;
  timestamp: string;
}>;

export class OverviewStatusService {
  routeContext: RouteContext;
  filterData: {
    locationFilter?: string[] | string;
    filtersStr?: string;
  } = {};
  constructor(routeContext: RouteContext) {
    this.routeContext = routeContext;
  }

  async getOverviewStatus() {
    const { request } = this.routeContext;
    const params = request.query as OverviewStatusQuery;

    this.filterData = await getMonitorFilters({
      ...params,
      context: this.routeContext,
    });

    const [allConfigs, statusResult] = await Promise.all([
      this.getMonitorConfigs(),
      this.getQueryResult(),
    ]);

    const { up, down, pending, upConfigs, downConfigs, pendingConfigs, disabledConfigs } =
      this.processOverviewStatus(allConfigs, statusResult);

    const {
      enabledMonitorQueryIds,
      disabledMonitorQueryIds,
      allIds,
      disabledCount,
      disabledMonitorsCount,
      projectMonitorsCount,
    } = processMonitors(allConfigs);

    return {
      allIds,
      allMonitorsCount: allConfigs.length,
      disabledMonitorsCount,
      projectMonitorsCount,
      enabledMonitorQueryIds,
      disabledMonitorQueryIds,
      disabledCount,
      up,
      down,
      pending,
      upConfigs,
      downConfigs,
      pendingConfigs,
      disabledConfigs,
    };
  }

  async getQueryResult() {
    return withApmSpan('monitor_status_data', async () => {
      const range = {
        // max monitor schedule period is 4 hours
        from: moment().subtract(4, 'hours').subtract(20, 'minutes').toISOString(),
        to: 'now',
      };

      const params = this.routeContext.request.query as OverviewStatusQuery;
      const { scopeStatusByLocation = true } = params;
      const { locationFilter } = this.filterData;

      const observerFilters =
        scopeStatusByLocation && !isEmpty(locationFilter)
          ? [
              {
                terms: {
                  'observer.name': locationFilter,
                },
              },
            ]
          : [];

      let hasMoreData = true;
      const monitorByIds = new Map<string, LocationStatus>();
      const pageSize = 5000;
      let afterKey: any;
      let count = 0;

      do {
        const result = await this.routeContext.syntheticsEsClient.search(
          {
            body: {
              size: 0,
              query: {
                bool: {
                  filter: [
                    FINAL_SUMMARY_FILTER,
                    getRangeFilter({ from: range.from, to: range.to }),
                    getTimespanFilter({ from: 'now-5m', to: 'now' }),
                    ...observerFilters,
                  ] as QueryDslQueryContainer[],
                },
              },
              aggs: {
                monitors: {
                  composite: {
                    size: pageSize,
                    sources: asMutableArray([
                      {
                        monitorId: {
                          terms: {
                            field: 'monitor.id',
                          },
                        },
                      },
                      {
                        locationId: {
                          terms: {
                            field: 'observer.name',
                          },
                        },
                      },
                    ] as const),
                    after: afterKey,
                  },
                  aggs: {
                    status: {
                      top_metrics: {
                        metrics: {
                          field: 'monitor.status',
                        },
                        sort: {
                          '@timestamp': 'desc',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          'getCurrentStatusOverview' + count
        );
        count += 1;

        hasMoreData = result.body.aggregations?.monitors.buckets.length === pageSize;
        afterKey = result.body.aggregations?.monitors.after_key;

        result.body.aggregations?.monitors.buckets.forEach(({ status: statusAgg, key: bKey }) => {
          const monitorId = String(bKey.monitorId);
          const locationId = String(bKey.locationId);
          const status = String(statusAgg.top?.[0].metrics?.['monitor.status']);
          const timestamp = String(statusAgg.top[0].sort[0]);
          if (!monitorByIds.has(String(monitorId))) {
            monitorByIds.set(monitorId, []);
          }
          monitorByIds.get(monitorId)?.push({ status, locationId, timestamp });
        });
      } while (hasMoreData);
      return monitorByIds;
    });
  }

  processOverviewStatus(
    monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>>,
    statusData: Map<string, LocationStatus>
  ) {
    let up = 0;
    let down = 0;
    const upConfigs: Record<string, OverviewStatusMetaData> = {};
    const downConfigs: Record<string, OverviewStatusMetaData> = {};
    const pendingConfigs: Record<string, OverviewStatusMetaData> = {};
    const disabledConfigs: Record<string, OverviewStatusMetaData> = {};

    const enabledMonitors = monitors.filter((monitor) => monitor.attributes[ConfigKey.ENABLED]);
    const disabledMonitors = monitors.filter((monitor) => !monitor.attributes[ConfigKey.ENABLED]);

    disabledMonitors.forEach((monitor) => {
      const monitorQueryId = monitor.attributes[ConfigKey.MONITOR_QUERY_ID];
      const meta = this.getMonitorMeta(monitor);
      monitor.attributes[ConfigKey.LOCATIONS]?.forEach((location) => {
        disabledConfigs[`${meta.configId}-${location.id}`] = {
          monitorQueryId,
          status: 'disabled',
          locationId: location.id,
          locationLabel: location.label,
          ...meta,
        };
      });
    });

    enabledMonitors.forEach((monitor) => {
      const monitorId = monitor.attributes[ConfigKey.MONITOR_QUERY_ID];
      const monitorStatus = statusData.get(monitorId);

      // discard any locations that are not in the monitorLocationsMap for the given monitor as well as those which are
      // in monitorLocationsMap but not in listOfLocations
      const monLocations = monitor.attributes[ConfigKey.LOCATIONS];
      // const monQueriedLocations = intersection(monLocations, monitorLocationIds);
      monLocations?.forEach((monLocation) => {
        const locData = monitorStatus?.find((loc) => loc.locationId === monLocation.id);
        const meta = {
          monitorQueryId: monitorId,
          locationId: monLocation.id,
          timestamp: locData?.timestamp,
          locationLabel: monLocation.label,
          ...this.getMonitorMeta(monitor),
        };
        const monLocId = `${meta.configId}-${monLocation.id}`;
        if (locData) {
          if (locData.status === 'down') {
            down += 1;
            downConfigs[monLocId] = {
              ...meta,
              status: 'down',
            };
          } else if (locData.status === 'up') {
            up += 1;
            upConfigs[monLocId] = {
              ...meta,
              status: 'up',
            };
          }
        } else {
          pendingConfigs[monLocId] = {
            status: 'unknown',
            ...meta,
          };
        }
      });
    });

    return {
      up,
      down,
      pending: Object.values(pendingConfigs).length,
      upConfigs,
      downConfigs,
      pendingConfigs,
      disabledConfigs,
    };
  }

  async getMonitorConfigs() {
    const { savedObjectsClient, request } = this.routeContext;
    const params = request.query as OverviewStatusQuery;
    const { query, showFromAllSpaces } = params;
    /**
     * Walk through all monitor saved objects, bucket IDs by disabled/enabled status.
     *
     * Track max period to make sure the snapshot query should reach back far enough to catch
     * latest ping for all enabled monitors.
     */

    const { filtersStr } = this.filterData;

    return await getAllMonitors({
      soClient: savedObjectsClient,
      showFromAllSpaces,
      search: query ? `${query}*` : undefined,
      filter: filtersStr,
      fields: [
        ConfigKey.ENABLED,
        ConfigKey.LOCATIONS,
        ConfigKey.MONITOR_QUERY_ID,
        ConfigKey.CONFIG_ID,
        ConfigKey.SCHEDULE,
        ConfigKey.MONITOR_SOURCE_TYPE,
        ConfigKey.MONITOR_TYPE,
        ConfigKey.NAME,
        ConfigKey.TAGS,
        ConfigKey.PROJECT_ID,
        ConfigKey.ALERT_CONFIG,
      ],
    });
  }

  getMonitorMeta(monitor: SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>) {
    return {
      name: monitor.attributes[ConfigKey.NAME],
      configId: monitor.attributes[ConfigKey.CONFIG_ID],
      schedule: monitor.attributes[ConfigKey.SCHEDULE].number,
      tags: monitor.attributes[ConfigKey.TAGS],
      isEnabled: monitor.attributes[ConfigKey.ENABLED],
      type: monitor.attributes[ConfigKey.MONITOR_TYPE],
      projectId: monitor.attributes[ConfigKey.PROJECT_ID],
      isStatusAlertEnabled: isStatusEnabled(monitor.attributes[ConfigKey.ALERT_CONFIG]),
      updated_at: monitor.updated_at,
      spaceId: monitor.namespaces?.[0],
    };
  }
}
