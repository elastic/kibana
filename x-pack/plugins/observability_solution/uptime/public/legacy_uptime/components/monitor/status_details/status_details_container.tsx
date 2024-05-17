/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MonitorStatusDetailsComponent } from '.';
import { MonitorIdParam } from '../../../../../common/types';
import { UptimeRefreshContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';
import { AppState } from '../../../state';
import { getMonitorLocationsAction } from '../../../state/actions/monitor';
import { monitorLocationsSelector } from '../../../state/selectors';

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
