/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useSelectedMonitor } from './use_selected_monitor';
import { useSelectedLocation } from './use_selected_location';
import { getMonitorRecentPingsAction, selectMonitorPingsMetadata } from '../../../state';

interface UseMonitorPingsProps {
  lastRefresh?: number;
  pageSize?: number;
  pageIndex?: number;
  from?: string;
  to?: string;
}

export const useMonitorPings = (props?: UseMonitorPingsProps) => {
  const dispatch = useDispatch();

  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();

  const monitorId = monitor?.id;
  const locationLabel = location?.label;

  useEffect(() => {
    if (monitorId && locationLabel) {
      dispatch(
        getMonitorRecentPingsAction.get({
          monitorId,
          locationId: locationLabel,
          size: props?.pageSize,
          pageIndex: props?.pageIndex,
          from: props?.from,
          to: props?.to,
        })
      );
    }
  }, [
    dispatch,
    monitorId,
    locationLabel,
    props?.lastRefresh,
    props?.pageSize,
    props?.pageIndex,
    props?.from,
    props?.to,
  ]);

  const { total, data: pings, loading } = useSelector(selectMonitorPingsMetadata);

  return {
    loading,
    total,
    pings,
  };
};
