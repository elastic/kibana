/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { getMonitorRecentPingsAction, selectLatestPing, selectPingsLoading } from '../../../state';
import { useSelectedLocation } from './use_selected_location';
import { useSelectedMonitor } from './use_selected_monitor';

interface UseMonitorLatestPingParams {
  monitorId?: string;
  locationLabel?: string;
}

export const useMonitorLatestPing = (params?: UseMonitorLatestPingParams) => {
  const dispatch = useDispatch();

  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();

  const monitorId = params?.monitorId ?? monitor?.id;
  const locationLabel = params?.locationLabel ?? location?.label;

  const latestPing = useSelector(selectLatestPing);
  const pingsLoading = useSelector(selectPingsLoading);

  const latestPingId = latestPing?.monitor.id;

  const isIdSame =
    latestPingId === monitorId || latestPingId === monitor?.[ConfigKey.CUSTOM_HEARTBEAT_ID];

  const isLocationSame = latestPing?.observer?.geo?.name === locationLabel;

  const isUpToDate = isIdSame && isLocationSame;

  useEffect(() => {
    if (monitorId && locationLabel && !isUpToDate) {
      dispatch(getMonitorRecentPingsAction.get({ monitorId, locationId: locationLabel }));
    }
  }, [dispatch, monitorId, locationLabel, isUpToDate]);

  if (!monitorId || !locationLabel) {
    return { loading: pingsLoading, latestPing: null };
  }

  if (!latestPing) {
    return { loading: pingsLoading, latestPing: null };
  }

  if (!isIdSame || !isLocationSame) {
    return { loading: pingsLoading, latestPing: null };
  }

  return { loading: pingsLoading, latestPing };
};
