/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import moment from 'moment';

import { ConfigKey } from '../../../../../../common/constants/monitor_management';
import { SourceType } from '../../../../../../common/runtime_types';
import { useRefreshedRange } from '../../../hooks';
import { useSelectedMonitor } from './use_selected_monitor';

export const useMonitorRangeFrom = () => {
  const { monitor, loading } = useSelectedMonitor();

  const { from, to } = useRefreshedRange(30, 'days');

  return useMemo(() => {
    if (monitor?.created_at) {
      const monitorCreatedDaysAgo = moment().diff(monitor.created_at, 'days');
      const isProjectMonitor = monitor?.[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT;

      // Always look back at lest 3 days to account for reinstated project monitors.
      if ((!isProjectMonitor || monitorCreatedDaysAgo > 3) && monitorCreatedDaysAgo < 30) {
        return { to, from: monitor.created_at, loading };
      }
    }
    return { to, from, loading };
  }, [monitor, to, from, loading]);
};
