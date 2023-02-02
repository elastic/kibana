/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { MonitorOverviewItem } from '../../../../common/runtime_types';
import { selectOverviewState } from '../state/overview';
import { useLocationNames } from './use_location_names';
import { useGetUrlParams } from './use_url_params';

export function useMonitorsSortedByStatus() {
  const { statusFilter } = useGetUrlParams();
  const {
    pageState: { sortOrder },
    data: { monitors },
    status,
  } = useSelector(selectOverviewState);

  const downMonitors = useRef<Record<string, string[]> | null>(null);
  const locationNames = useLocationNames();

  const monitorsSortedByStatus = useMemo(() => {
    if (!status) {
      return {
        down: [],
        up: [],
        disabled: [],
      };
    }

    const { downConfigs } = status;
    const downMonitorMap: Record<string, string[]> = {};
    Object.values(downConfigs).forEach(({ location, configId }) => {
      if (downMonitorMap[configId]) {
        downMonitorMap[configId].push(location);
      } else {
        downMonitorMap[configId] = [location];
      }
    });

    const orderedDownMonitors: MonitorOverviewItem[] = [];
    const orderedUpMonitors: MonitorOverviewItem[] = [];
    const orderedDisabledMonitors: MonitorOverviewItem[] = [];

    monitors.forEach((monitor) => {
      const monitorLocation = locationNames[monitor.location.id];
      if (!monitor.isEnabled) {
        orderedDisabledMonitors.push(monitor);
      } else if (
        monitor.configId in downMonitorMap &&
        downMonitorMap[monitor.configId].includes(monitorLocation)
      ) {
        orderedDownMonitors.push(monitor);
      } else {
        orderedUpMonitors.push(monitor);
      }
    });
    downMonitors.current = downMonitorMap;

    return {
      down: orderedDownMonitors,
      up: orderedUpMonitors,
      disabled: orderedDisabledMonitors,
    };
  }, [monitors, locationNames, downMonitors, status]);

  return useMemo(() => {
    switch (statusFilter) {
      case 'down':
        return {
          monitorsSortedByStatus: monitorsSortedByStatus.down,
          downMonitors: downMonitors.current,
        };
      case 'up':
        return {
          monitorsSortedByStatus: monitorsSortedByStatus.up,
          downMonitors: downMonitors.current,
        };
      case 'disabled':
        return {
          monitorsSortedByStatus: monitorsSortedByStatus.disabled,
          downMonitors: downMonitors.current,
        };
      default:
        break;
    }
    const upAndDownMonitors =
      sortOrder === 'asc'
        ? [...monitorsSortedByStatus.down, ...monitorsSortedByStatus.up]
        : [...monitorsSortedByStatus.up, ...monitorsSortedByStatus.down];

    return {
      monitorsSortedByStatus: [...upAndDownMonitors, ...monitorsSortedByStatus.disabled],
      downMonitors: downMonitors.current,
    };
  }, [downMonitors, monitorsSortedByStatus, sortOrder, statusFilter]);
}
