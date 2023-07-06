/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiDescriptionList, EuiSkeletonText } from '@elastic/eui';
import { MonitorStatus, STATUS_LABEL } from '../common/components/monitor_status';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';

export const MonitorDetailsStatus = () => {
  const { latestPing, loading: pingsLoading } = useMonitorLatestPing();

  const { monitor, isMonitorMissing } = useSelectedMonitor();

  if (!monitor) {
    return (
      <EuiDescriptionList
        align="left"
        compressed={false}
        listItems={[
          {
            title: STATUS_LABEL,
            description: isMonitorMissing ? <></> : <EuiSkeletonText lines={1} />,
          },
        ]}
      />
    );
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
