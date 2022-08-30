/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import { useEsSearch } from '@kbn/observability-plugin/public';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
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
    pageState: { sortOrder, sortField },
    data: { allMonitorIds, monitors },
  } = useSelector(selectOverviewState);
  const [monitorsSortedByStatus, setMonitorsSortedByStatus] = useState<MonitorOverviewItem[]>([]);
  const [downMonitors, setDownMonitors] = useState({});
  const locationNames = useLocationNames();
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();

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
        sort: [{ '@timestamp': 'desc' }],
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
    [lastRefresh, monitorId],
    { name: 'getMonitorStatusByLocation' }
  );

  useEffect(() => {
    if (!data || loading) {
      return;
    }
    console.warn('useEffectRan');
    const downMonitorMap: Record<string, string[]> = {};
    (data.aggregations?.ids?.buckets || []).forEach((idBucket) => {
      idBucket.locations.buckets.forEach((location) => {
        const ping = location.summary.hits.hits[0]._source as Ping;
        const configId = ping.config_id!;
        const isDown = (ping?.summary?.down || 0) > 0;
        const locationName = ping?.observer?.geo?.name;
        if (!isDown) {
          return;
        }
        if (downMonitorMap[configId]) {
          downMonitorMap[configId].push(locationName!);
        } else {
          downMonitorMap[configId] = [locationName!];
        }
      });
    });

    if (!isEqual(downMonitorMap, downMonitors)) {
      console.warn('reordering');
      const orderdMonitors: MonitorOverviewItem[] = [];
      monitors.forEach((monitor) => {
        const monitorLocation = locationNames[monitor.location.id];
        if (
          Object.keys(downMonitorMap).includes(monitor.id) &&
          downMonitorMap[monitor.id].includes(monitorLocation)
        ) {
          orderdMonitors.unshift(monitor);
        } else {
          orderdMonitors.push(monitor);
        }
      });
      setDownMonitors(downMonitorMap);
      setMonitorsSortedByStatus(orderdMonitors);
    }
  }, [data, monitors, locationNames, downMonitors, loading]);

  return useMemo(() => {
    return {
      monitorsSortedByStatus:
        sortOrder === 'asc' ? monitorsSortedByStatus : monitorsSortedByStatus.reverse(),
      downMonitors,
    };
  }, [downMonitors, monitorsSortedByStatus, sortOrder]);
}
