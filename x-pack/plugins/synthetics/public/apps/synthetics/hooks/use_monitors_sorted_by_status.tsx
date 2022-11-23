/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { MonitorOverviewItem, OverviewStatusMetaData } from '../../../../common/runtime_types';
import { selectOverviewState } from '../state/overview';
import { useLocationNames } from './use_location_names';
import { useGetUrlParams } from './use_url_params';

function configsToMap(configs: OverviewStatusMetaData[]) {
  const downMonitorMap: Record<string, string[]> = {};
  configs.forEach(({ location, configId }) => {
    if (downMonitorMap[configId]) {
      downMonitorMap[configId].push(location);
    } else {
      downMonitorMap[configId] = [location];
    }
  });
  return downMonitorMap;
}

export function useMonitorsSortedByStatus() {
  const { statusFilter } = useGetUrlParams();
  const {
    pageState: { sortOrder },
    data: { monitors },
    status,
  } = useSelector(selectOverviewState);
  const [monitorsSortedByStatus, setMonitorsSortedByStatus] = useState<
    Record<string, MonitorOverviewItem[]>
  >({ up: [], down: [], disabled: [], pending: [] });
  console.log('monitor status', status);
  console.log('monitor sorted', monitorsSortedByStatus);
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
    const { downConfigs, upConfigs } = status;
    const downMonitorMap = configsToMap(downConfigs);
    const upMonitorMap = configsToMap(upConfigs);
    console.log('monitor maps', downMonitorMap, upMonitorMap);

    if (
      !isEqual(downMonitorMap, downMonitors.current) ||
      !isEqual(monitors, currentMonitors.current)
    ) {
      const orderedDownMonitors: MonitorOverviewItem[] = [];
      const orderedUpMonitors: MonitorOverviewItem[] = [];
      const orderedDisabledMonitors: MonitorOverviewItem[] = [];
      const orderedPendingMonitors: MonitorOverviewItem[] = [];
      monitors.forEach((monitor) => {
        const monitorLocation = locationNames[monitor.location.id];
        console.log('monitor', monitor.id, monitor);
        if (!monitor.isEnabled) {
          console.log('monitor is disabled', monitor.id, monitorLocation);
          orderedDisabledMonitors.push(monitor);
        } else if (
          Object.keys(downMonitorMap).includes(monitor.id) &&
          downMonitorMap[monitor.id].includes(monitorLocation)
        ) {
          console.log('monitor is enabled and down', monitor.id, monitorLocation);
          orderedDownMonitors.push(monitor);
        } else if (
          Object.keys(upMonitorMap).includes(monitor.id) &&
          upMonitorMap[monitor.id].includes(monitorLocation)
        ) {
          console.log('monitor is enabled and up', monitor.id, monitorLocation);
          orderedUpMonitors.push(monitor);
        } else {
          console.log('monitor is not down or up, pending', monitor.id, monitorLocation);
          orderedPendingMonitors.push(monitor);
        }
      });
      downMonitors.current = downMonitorMap;
      currentMonitors.current = monitors;
      setMonitorsSortedByStatus({
        down: orderedDownMonitors,
        up: orderedUpMonitors,
        disabled: orderedDisabledMonitors,
        pending: orderedPendingMonitors,
      });
    }
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
      case 'pending':
        return {
          monitorsSortedByStatus: monitorsSortedByStatus.pending,
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
      monitorsSortedByStatus: [
        ...upAndDownMonitors,
        ...monitorsSortedByStatus.disabled,
        ...monitorsSortedByStatus.pending,
      ],
      downMonitors: downMonitors.current,
    };
  }, [downMonitors, monitorsSortedByStatus, sortOrder, statusFilter]);
}
