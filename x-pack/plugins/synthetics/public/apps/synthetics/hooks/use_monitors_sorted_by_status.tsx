/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { isEqual } from 'lodash';
import { useEsSearch } from '@kbn/observability-plugin/public';
import { useSelector } from 'react-redux';
import { Ping, MonitorOverviewItem } from '../../../../common/runtime_types';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  getTimeSpanFilter,
  SUMMARY_FILTER,
} from '../../../../common/constants/client_defaults';
import { SYNTHETICS_INDEX_PATTERN, UNNAMED_LOCATION } from '../../../../common/constants';
import { selectOverviewState } from '../state/overview';
import { useSyntheticsRefreshContext } from '../contexts';
import { useLocationNames } from './use_location_names';

export function useMonitorsSortedByStatus(shouldUpdate: boolean) {
  const {
    pageState: { sortOrder },
    data: { allMonitorIds, monitors },
  } = useSelector(selectOverviewState);
  const [monitorsSortedByStatus, setMonitorsSortedByStatus] = useState<
    Record<string, MonitorOverviewItem[]>
  >({ up: [], down: [], disabled: [] });
  const downMonitors = useRef<Record<string, string[]> | null>(null);
  const currentMonitors = useRef<MonitorOverviewItem[] | null>(monitors);
  const locationNames = useLocationNames();
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { data, loading } = useEsSearch(
    {
      index: shouldUpdate ? SYNTHETICS_INDEX_PATTERN : '',
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              SUMMARY_FILTER,
              EXCLUDE_RUN_ONCE_FILTER,
              getTimeSpanFilter(),
              {
                terms: {
                  config_id: allMonitorIds,
                },
              },
            ],
          },
        },
        sort: [{ 'monitor.name': 'desc' }],
        aggs: {
          ids: {
            terms: {
              field: 'monitor.id',
              size: 5000,
            },
            aggs: {
              locations: {
                terms: {
                  field: 'observer.geo.name',
                  missing: UNNAMED_LOCATION,
                  size: 1000,
                  order: { _key: 'asc' },
                },
                aggs: {
                  summary: {
                    top_hits: {
                      size: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    [lastRefresh, allMonitorIds, shouldUpdate, currentMonitors.current],
    { name: 'getMonitorStatusByLocation' }
  );

  useEffect(() => {
    if (loading) {
      return;
    }
    const downMonitorMap: Record<string, string[]> = {};
    (data.aggregations?.ids?.buckets || []).forEach((idBucket) => {
      idBucket.locations.buckets.forEach((location) => {
        const ping = location.summary.hits.hits[0]._source as Ping;
        if ((!ping?.summary?.down || 0) > 0) {
          return;
        }
        const configId = ping.config_id!;
        const locationName = ping?.observer?.geo?.name;
        if (downMonitorMap[configId]) {
          downMonitorMap[configId].push(locationName!);
        } else {
          downMonitorMap[configId] = [locationName!];
        }
      });
    });

    if (
      !isEqual(downMonitorMap, downMonitors.current) ||
      !isEqual(monitors, currentMonitors.current)
    ) {
      const orderedDownMonitors: MonitorOverviewItem[] = [];
      const orderedUpMonitors: MonitorOverviewItem[] = [];
      const orderedDisabledMonitors: MonitorOverviewItem[] = [];
      monitors.forEach((monitor) => {
        const monitorLocation = locationNames[monitor.location.id];
        if (!monitor.isEnabled) {
          orderedDisabledMonitors.push(monitor);
        } else if (
          Object.keys(downMonitorMap).includes(monitor.id) &&
          downMonitorMap[monitor.id].includes(monitorLocation)
        ) {
          orderedDownMonitors.push(monitor);
        } else {
          orderedUpMonitors.push(monitor);
        }
      });
      downMonitors.current = downMonitorMap;
      currentMonitors.current = monitors;
      setMonitorsSortedByStatus({
        down: orderedDownMonitors,
        up: orderedUpMonitors,
        disabled: orderedDisabledMonitors,
      });
    }
  }, [data, monitors, locationNames, downMonitors, loading]);

  return useMemo(() => {
    const upAndDownMonitors =
      sortOrder === 'asc'
        ? [...monitorsSortedByStatus.down, ...monitorsSortedByStatus.up]
        : [...monitorsSortedByStatus.up, ...monitorsSortedByStatus.down];

    return {
      monitorsSortedByStatus: [...upAndDownMonitors, ...monitorsSortedByStatus.disabled],
      downMonitors: downMonitors.current,
    };
  }, [downMonitors, monitorsSortedByStatus, sortOrder]);
}
