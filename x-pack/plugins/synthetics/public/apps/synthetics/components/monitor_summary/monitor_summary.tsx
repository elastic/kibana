/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getSyntheticsMonitorAction, selectMonitorStatus } from '../../state/monitor_summary';
import { useMonitorListBreadcrumbs } from '../monitors_page/hooks/use_breadcrumbs';
export const MonitorSummaryPage = () => {
  const { data } = useSelector(selectMonitorStatus);

  useMonitorListBreadcrumbs([{ text: data?.monitor.name ?? '' }]);

  const dispatch = useDispatch();

  const { monitorId } = useParams<{ monitorId: string }>();

  useEffect(() => {
    dispatch(getSyntheticsMonitorAction.get(monitorId));
  }, [dispatch, monitorId]);

  return <></>;
};
