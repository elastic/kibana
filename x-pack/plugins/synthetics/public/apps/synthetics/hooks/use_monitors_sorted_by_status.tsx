/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { isEqual } from 'lodash';
import { useSelector } from 'react-redux';
import { MonitorOverviewItem } from '../../../../common/runtime_types';
import { selectOverviewState } from '../state/overview';
import { useLocationNames } from './use_location_names';

export function useMonitorsSortedByStatus(shouldUpdate: boolean) {
  const {
    pageState: { sortOrder },
    data: { monitors },
    status,
  } = useSelector(selectOverviewState);
  const [monitorsSortedByStatus, setMonitorsSortedByStatus] = useState<
    Record<string, MonitorOverviewItem[]>
  >({ up: [], down: [], disabled: [] });
  const downMonitors = useRef<Record<string, string[]> | null>(null);
  const currentMonitors = useRef<MonitorOverviewItem[] | null>(monitors);
  const locationNames = useLocationNames();

  useEffect(() => {
    if (!status) {
      return;
    }
    const { downConfigs } = status;
    const downMonitorMap: Record<string, string[]> = {};
    downConfigs.forEach(({ location, configId }) => {
      if (downMonitorMap[configId]) {
        downMonitorMap[configId].push(location);
      } else {
        downMonitorMap[configId] = [location];
      }
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
  }, [monitors, locationNames, downMonitors, status]);

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
