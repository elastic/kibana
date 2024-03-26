/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectOverviewStatus } from '../state/overview_status';
import { MonitorOverviewItem } from '../../../../common/runtime_types';
import { selectOverviewState } from '../state/overview';
import { useGetUrlParams } from './use_url_params';

export function useMonitorsSortedByStatus() {
  const { statusFilter } = useGetUrlParams();
  const { status } = useSelector(selectOverviewStatus);

  const {
    pageState: { sortOrder },
    data: { monitors },
  } = useSelector(selectOverviewState);

  const downMonitors = useRef<Record<string, string[]> | null>(null);

  const monitorsSortedByStatus = useMemo(() => {
    if (!status) {
      return {
        down: [],
        up: [],
        disabled: [],
        pending: [],
      };
    }

    const { downConfigs, pendingConfigs } = status;
    const downMonitorMap: Record<string, string[]> = {};
    Object.values(downConfigs).forEach(({ locationId, configId }) => {
      if (downMonitorMap[configId]) {
        downMonitorMap[configId].push(locationId);
      } else {
        downMonitorMap[configId] = [locationId];
      }
    });

    const orderedDownMonitors: MonitorOverviewItem[] = [];
    const orderedUpMonitors: MonitorOverviewItem[] = [];
    const orderedDisabledMonitors: MonitorOverviewItem[] = [];
    const orderedPendingMonitors: MonitorOverviewItem[] = [];

    monitors.forEach((monitor) => {
      if (!monitor.isEnabled) {
        orderedDisabledMonitors.push(monitor);
      } else if (
        monitor.configId in downMonitorMap &&
        downMonitorMap[monitor.configId].includes(monitor.location.id)
      ) {
        orderedDownMonitors.push(monitor);
      } else if (pendingConfigs?.[`${monitor.configId}-${monitor.location.id}`]) {
        orderedPendingMonitors.push(monitor);
      } else {
        orderedUpMonitors.push(monitor);
      }
    });
    downMonitors.current = downMonitorMap;

    return {
      down: orderedDownMonitors,
      up: orderedUpMonitors,
      disabled: orderedDisabledMonitors,
      pending: orderedPendingMonitors,
    };
  }, [monitors, downMonitors, status]);

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
