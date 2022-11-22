/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { MonitorStatus } from '../common/components/monitor_status';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';

export const MonitorDetailsStatus = () => {
  const { latestPing, loading: pingsLoading } = useMonitorLatestPing();

  const { monitor } = useSelectedMonitor();

  if (!monitor) {
    return null;
  }

  return (
    <MonitorStatus
      status={latestPing?.monitor.status}
      monitor={monitor}
      loading={pingsLoading}
      compressed={false}
    />
  );
};
