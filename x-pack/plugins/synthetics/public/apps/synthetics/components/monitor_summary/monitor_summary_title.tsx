/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getMonitorStatusAction, selectMonitorStatus } from '../../state/monitor_summary';

export const MonitorSummaryTitle = () => {
  const dispatch = useDispatch();

  const { data } = useSelector(selectMonitorStatus);

  const { monitorId } = useParams<{ monitorId: string }>();

  useEffect(() => {
    dispatch(getMonitorStatusAction.get({ monitorId, dateStart: 'now-15m', dateEnd: 'now' }));
  }, [dispatch, monitorId]);

  return <>{data?.monitor.name}</>;
};
