/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../../../state';
import { monitorDetailsSelector } from '../../../../state/selectors';
import { getMonitorDetailsAction } from '../../../../state/actions/monitor';
import { MonitorListDrawerComponent } from './monitor_list_drawer';
import { useGetUrlParams } from '../../../../hooks';
import { MonitorSummary } from '../../../../../common/runtime_types';

interface ContainerProps {
  summary: MonitorSummary;
}

export const MonitorListDrawer: React.FC<ContainerProps> = ({ summary }) => {
  const monitorId = summary?.monitor_id;

  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = useGetUrlParams();

  const monitorDetails = useSelector((state: AppState) => monitorDetailsSelector(state, summary));

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      getMonitorDetailsAction.get({
        dateStart,
        dateEnd,
        monitorId,
      })
    );
  }, [dateStart, dateEnd, monitorId, dispatch]);
  return <MonitorListDrawerComponent monitorDetails={monitorDetails} summary={summary} />;
};
