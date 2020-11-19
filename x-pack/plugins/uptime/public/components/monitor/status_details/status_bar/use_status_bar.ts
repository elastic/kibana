/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UptimeRefreshContext } from '../../../../contexts';
import { useGetUrlParams, useMonitorId } from '../../../../hooks';
import { monitorLocationsSelector, monitorStatusSelector } from '../../../../state/selectors';
import { AppState } from '../../../../state';
import { getMonitorStatusAction } from '../../../../state/actions';
import { Ping } from '../../../../../common/runtime_types/ping';
import { MonitorLocations } from '../../../../../common/runtime_types/monitor';

interface MonitorStatusBarProps {
  monitorId: string;
  monitorStatus: Ping | null;
  monitorLocations?: MonitorLocations;
}

export const useStatusBar = (): MonitorStatusBarProps => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = useGetUrlParams();

  const dispatch = useDispatch();

  const monitorId = useMonitorId();

  const monitorStatus = useSelector(monitorStatusSelector);

  const monitorLocations = useSelector((state: AppState) =>
    monitorLocationsSelector(state, monitorId)
  );

  useEffect(() => {
    dispatch(getMonitorStatusAction({ dateStart, dateEnd, monitorId }));
  }, [monitorId, dateStart, dateEnd, lastRefresh, dispatch]);

  return { monitorStatus, monitorLocations, monitorId };
};
