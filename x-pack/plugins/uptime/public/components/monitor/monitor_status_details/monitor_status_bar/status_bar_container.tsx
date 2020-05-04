/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { monitorLocationsSelector, monitorStatusSelector } from '../../../../state/selectors';
import { MonitorStatusBarComponent } from './index';
import { getMonitorStatusAction } from '../../../../state/actions';
import { useGetUrlParams } from '../../../../hooks';
import { UptimeRefreshContext } from '../../../../contexts';
import { MonitorIdParam } from '../../../../../common/types';
import { AppState } from '../../../../state';

export const MonitorStatusBar: React.FC<MonitorIdParam> = ({ monitorId }) => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = useGetUrlParams();

  const dispatch = useDispatch();

  const monitorStatus = useSelector(monitorStatusSelector);
  const monitorLocations = useSelector((state: AppState) =>
    monitorLocationsSelector(state, monitorId)
  );

  useEffect(() => {
    dispatch(getMonitorStatusAction({ dateStart, dateEnd, monitorId }));
  }, [monitorId, dateStart, dateEnd, lastRefresh, dispatch]);

  return (
    <MonitorStatusBarComponent
      monitorId={monitorId}
      monitorStatus={monitorStatus}
      monitorLocations={monitorLocations!}
    />
  );
};
