/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { ConfigKey, PingStatus } from '../../../../../../common/runtime_types';
import {
  getMonitorPingStatusesAction,
  selectIsMonitorStatusesLoading,
  selectPingStatusesForMonitorAndLocationAsc,
} from '../../../state';

import { useSelectedMonitor } from './use_selected_monitor';
import { useSelectedLocation } from './use_selected_location';

export const usePingStatuses = ({
  from,
  to,
  size,
  monitorInterval,
  lastRefresh,
}: {
  from: number;
  to: number;
  size: number;
  monitorInterval: number;
  lastRefresh: number;
}) => {
  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();

  const pingStatusesSelector = useCallback(() => {
    return selectPingStatusesForMonitorAndLocationAsc(
      monitor?.[ConfigKey.CONFIG_ID] ?? '',
      location?.label ?? ''
    );
  }, [monitor, location?.label]);
  const isLoading = useSelector(selectIsMonitorStatusesLoading);
  const pingStatuses = useSelector(pingStatusesSelector()) as PingStatus[];
  const dispatch = useDispatch();

  const lastCall = useRef({ monitorId: '', locationLabel: '', to: 0, from: 0, lastRefresh: 0 });
  const toDiff = Math.abs(lastCall.current.to - to) / (1000 * 60);
  const fromDiff = Math.abs(lastCall.current.from - from) / (1000 * 60);
  const lastRefreshDiff = Math.abs(lastCall.current.lastRefresh - lastRefresh) / (1000 * 60);
  const isDataChangedEnough =
    toDiff >= monitorInterval ||
    fromDiff >= monitorInterval ||
    lastRefreshDiff >= 3 || // Minimum monitor interval
    monitor?.id !== lastCall.current.monitorId ||
    location?.label !== lastCall.current.locationLabel;

  useEffect(() => {
    if (!isLoading && isDataChangedEnough && monitor?.id && location?.label && from && to && size) {
      dispatch(
        getMonitorPingStatusesAction.get({
          monitorId: monitor.id,
          locationId: location.label,
          from,
          to,
          size,
        })
      );

      lastCall.current = {
        monitorId: monitor.id,
        locationLabel: location?.label,
        to,
        from,
        lastRefresh,
      };
    }
    // `isLoading` shouldn't be included in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, monitor?.id, location?.label, from, to, size, isDataChangedEnough, lastRefresh]);

  return pingStatuses.filter(({ timestamp }) => {
    const timestampN = Number(new Date(timestamp));
    return timestampN >= from && timestampN <= to;
  });
};

export const usePingStatusesIsLoading = () => {
  return useSelector(selectIsMonitorStatusesLoading) as boolean;
};
