/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { throttle } from 'lodash';
import { useSelector, useDispatch } from 'react-redux';

import { scheduleToMinutes } from '../../../../../../common/lib/schedule_to_time';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';

import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import {
  dateToMilli,
  createTimeBuckets,
  CHART_CELL_WIDTH,
  indexBinsByEndTime,
  MonitorStatusPanelProps,
  createStatusTimeBins,
  MonitorStatusTimeBin,
} from './monitor_status_data';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { getMonitorStatusHeatmapAction, selectHeatmap } from '../../../state/status_heatmap';

export const useMonitorStatusData = ({
  from,
  to,
}: Pick<MonitorStatusPanelProps, 'from' | 'to'>) => {
  const { lastRefresh } = useSyntheticsRefreshContext();
  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();
  const monitorInterval = Math.max(3, monitor?.schedule ? scheduleToMinutes(monitor?.schedule) : 3);

  const fromMillis = dateToMilli(from);
  const toMillis = dateToMilli(to);
  const totalMinutes = Math.ceil(toMillis - fromMillis) / (1000 * 60);

  const [binsAvailableByWidth, setBinsAvailableByWidth] = useState<number | null>(null);
  const minsPerBin = Math.floor(
    Math.max(
      monitorInterval,
      binsAvailableByWidth !== null ? totalMinutes / binsAvailableByWidth : 0
    )
  );

  const dispatch = useDispatch();
  const { heatmap: dateHistogram, loading } = useSelector(selectHeatmap);

  useEffect(() => {
    if (monitor?.id && location?.label) {
      dispatch(
        getMonitorStatusHeatmapAction.get({
          monitorId: monitor.id,
          location: location.label,
          from,
          to,
          interval: minsPerBin,
        })
      );
    }
  }, [dispatch, from, to, minsPerBin, location?.label, monitor?.id, lastRefresh]);

  // Disabling deps warning as we wanna throttle the callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleResize = useCallback(
    throttle((e: { width: number; height: number }) => {
      setBinsAvailableByWidth(Math.floor(e.width / CHART_CELL_WIDTH));
    }, 500),
    []
  );

  const { timeBins, timeBinMap, xDomain } = useMemo((): {
    timeBins: MonitorStatusTimeBin[];
    timeBinMap: Map<number, MonitorStatusTimeBin>;
    xDomain: { min: number; max: number };
  } => {
    const timeBuckets = createTimeBuckets(minsPerBin, fromMillis, toMillis);
    const bins = createStatusTimeBins(timeBuckets, dateHistogram);
    return {
      timeBins: bins,
      timeBinMap: indexBinsByEndTime(bins),
      xDomain: {
        min: bins?.[0]?.end ?? fromMillis,
        max: bins?.[bins.length - 1]?.end ?? toMillis,
      },
    };
  }, [minsPerBin, fromMillis, toMillis, dateHistogram]);

  return {
    loading,
    minsPerBin,
    timeBins,
    getTimeBinByXValue: (xValue: number | undefined) =>
      xValue === undefined ? undefined : timeBinMap.get(xValue),
    xDomain,
    handleResize,
  };
};
