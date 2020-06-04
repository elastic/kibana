/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUrlParams } from '../../../hooks';
import { monitorLocationsSelector } from '../../../state/selectors';
import { getMonitorLocationsAction } from '../../../state/actions/monitor';
import { MonitorStatusDetailsComponent } from './index';
import { UptimeRefreshContext } from '../../../contexts';
import { AppState } from '../../../state';
import { MonitorIdParam } from '../../../../common/types';

export const MonitorStatusDetails: React.FC<MonitorIdParam> = ({ monitorId }) => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = useGetUrlParams();

  const dispatch = useDispatch();
  const monitorLocations = useSelector((state: AppState) =>
    monitorLocationsSelector(state, monitorId)
  );

  useEffect(() => {
    dispatch(getMonitorLocationsAction({ dateStart, dateEnd, monitorId }));
  }, [monitorId, dateStart, dateEnd, lastRefresh, dispatch]);

  return <MonitorStatusDetailsComponent monitorLocations={monitorLocations!} />;
};
