/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useMonitorId } from '../hooks';
import { MonitorCharts } from '../components/monitor';
import { MonitorStatusDetails, PingList } from '../components/monitor';
import { getDynamicSettings } from '../state/actions/dynamic_settings';
import { setSelectedMonitorId } from '../state/actions';
import { getMonitorAlertsAction } from '../state/alerts/alerts';
import { useInitApp } from '../hooks/use_init_app';

export const MonitorPage: React.FC = () => {
  const dispatch = useDispatch();

  useInitApp();

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  const monitorId = useMonitorId();

  useEffect(() => {
    dispatch(setSelectedMonitorId(monitorId));
    dispatch(getMonitorAlertsAction.get());
  }, [monitorId, dispatch]);

  useTrackPageview({ app: 'uptime', path: 'monitor' });
  useTrackPageview({ app: 'uptime', path: 'monitor', delay: 15000 });

  return (
    <>
      <MonitorStatusDetails monitorId={monitorId} />
      <EuiSpacer size="s" />
      <MonitorCharts monitorId={monitorId} />
      <EuiSpacer size="s" />
      <PingList />
    </>
  );
};
