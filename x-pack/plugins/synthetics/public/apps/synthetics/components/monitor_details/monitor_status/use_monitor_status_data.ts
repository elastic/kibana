/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { throttle } from 'lodash';

import { scheduleToMinutes } from '../../../../../../common/lib/schedule_to_time';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';

import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { usePingStatuses } from '../hooks/use_ping_statuses';
import {
  dateToMilli,
  createTimeBuckets,
  createStatusTimeBins,
  CHART_CELL_WIDTH,
  indexBinsByEndTime,
  MonitorStatusPanelProps,
} from './monitor_status_data';

export const useMonitorStatusData = ({
  from,
  to,
}: Pick<MonitorStatusPanelProps, 'from' | 'to'>) => {
  const { lastRefresh } = useSyntheticsRefreshContext();
  const { monitor } = useSelectedMonitor();
  const monitorInterval = Math.max(3, monitor?.schedule ? scheduleToMinutes(monitor?.schedule) : 3);

  const fromMillis = dateToMilli(from);
  const toMillis = dateToMilli(to);
  const totalMinutes = Math.ceil(toMillis - fromMillis) / (1000 * 60);
  const pingStatuses = usePingStatuses({
    from: fromMillis,
    to: toMillis,
    size: Math.min(10000, Math.ceil((totalMinutes / monitorInterval) * 2)), // Acts as max size between from - to
    monitorInterval,
    lastRefresh,
  });

  const [binsAvailableByWidth, setBinsAvailableByWidth] = useState(50);
  const intervalByWidth = Math.floor(
    Math.max(monitorInterval, totalMinutes / binsAvailableByWidth)
  );

  // Disabling deps warning as we wanna throttle the callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleResize = useCallback(
    throttle((e: { width: number; height: number }) => {
      setBinsAvailableByWidth(Math.floor(e.width / CHART_CELL_WIDTH));
    }, 500),
    []
  );

  const { timeBins, timeBinsByEndTime, xDomain } = useMemo(() => {
    const timeBuckets = createTimeBuckets(intervalByWidth, fromMillis, toMillis);
    const bins = createStatusTimeBins(timeBuckets, pingStatuses);
    const indexedBins = indexBinsByEndTime(bins);

    const timeDomain = {
      min: bins?.[0]?.end ?? fromMillis,
      max: bins?.[bins.length - 1]?.end ?? toMillis,
    };

    return { timeBins: bins, timeBinsByEndTime: indexedBins, xDomain: timeDomain };
  }, [intervalByWidth, pingStatuses, fromMillis, toMillis]);

  return {
    intervalByWidth,
    timeBins,
    xDomain,
    handleResize,
    getTimeBinByXValue: (xValue: number | undefined) =>
      xValue === undefined ? undefined : timeBinsByEndTime.get(xValue),
  };
};
