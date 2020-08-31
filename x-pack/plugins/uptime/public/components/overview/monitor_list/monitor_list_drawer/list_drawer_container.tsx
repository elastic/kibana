/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../../../state';
import { monitorDetailsLoadingSelector, monitorDetailsSelector } from '../../../../state/selectors';
import { getMonitorDetailsAction } from '../../../../state/actions/monitor';
import { MonitorListDrawerComponent } from './monitor_list_drawer';
import { useGetUrlParams } from '../../../../hooks';
import { MonitorSummary } from '../../../../../common/runtime_types';
import { alertsSelector } from '../../../../state/alerts/alerts';
import { UptimeRefreshContext } from '../../../../contexts';

interface ContainerProps {
  summary: MonitorSummary;
}

export const MonitorListDrawer: React.FC<ContainerProps> = ({ summary }) => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const monitorId = summary?.monitor_id;

  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = useGetUrlParams();

  const monitorDetails = useSelector((state: AppState) => monitorDetailsSelector(state, summary));

  const isLoading = useSelector(monitorDetailsLoadingSelector);

  const dispatch = useDispatch();

  const { data: alerts, loading: alertsLoading } = useSelector(alertsSelector);

  const hasAlert = (alerts?.data ?? []).find((alert) => alert.params.search.includes(monitorId));

  useEffect(() => {
    dispatch(
      getMonitorDetailsAction.get({
        dateStart,
        dateEnd,
        monitorId,
      })
    );
  }, [dateStart, dateEnd, monitorId, dispatch, hasAlert, lastRefresh]);
  return (
    <MonitorListDrawerComponent
      monitorDetails={monitorDetails}
      summary={summary}
      loading={isLoading || alertsLoading}
    />
  );
};
