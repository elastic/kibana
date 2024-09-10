/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { OverviewStatusMetaData } from '../../../../common/runtime_types';
import { selectOverviewStatus } from '../state/overview_status';
import { selectOverviewState } from '../state/overview';
import { useGetUrlParams } from './use_url_params';

export function useMonitorsSortedByStatus(): OverviewStatusMetaData[] {
  const { statusFilter } = useGetUrlParams();
  const { status, disabledConfigs } = useSelector(selectOverviewStatus);

  const {
    pageState: { sortOrder },
  } = useSelector(selectOverviewState);

  return useMemo(() => {
    if (!status) {
      return [];
    }

    const { downConfigs, pendingConfigs, upConfigs } = status;

    switch (statusFilter) {
      case 'down':
        return Object.values(downConfigs) as OverviewStatusMetaData[];
      case 'up':
        return Object.values(upConfigs) as OverviewStatusMetaData[];
      case 'disabled':
        return Object.values(disabledConfigs ?? {}) as OverviewStatusMetaData[];
      case 'pending':
        return Object.values(pendingConfigs) as OverviewStatusMetaData[];
      default:
        break;
    }

    const upAndDownMonitors =
      sortOrder === 'asc'
        ? [...Object.values(downConfigs), ...Object.values(upConfigs)]
        : [...Object.values(upConfigs), ...Object.values(downConfigs)];

    return [
      ...upAndDownMonitors,
      ...Object.values(disabledConfigs ?? {}),
      ...Object.values(pendingConfigs),
    ] as OverviewStatusMetaData[];
  }, [disabledConfigs, sortOrder, status, statusFilter]);
}
