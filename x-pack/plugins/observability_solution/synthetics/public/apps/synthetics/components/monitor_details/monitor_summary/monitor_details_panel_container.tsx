/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { ConfigKey } from '../../../../../../common/runtime_types';
import {
  MonitorDetailsPanel,
  MonitorDetailsPanelProps,
} from '../../common/components/monitor_details_panel';
import { useMonitorLatestPing } from '../hooks/use_monitor_latest_ping';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';

export const MonitorDetailsPanelContainer = (props: Partial<MonitorDetailsPanelProps>) => {
  const { latestPing } = useMonitorLatestPing();

  const { monitorId: configId } = useParams<{ monitorId: string }>();

  const { monitor, loading } = useSelectedMonitor();

  const isPingRelevant =
    latestPing?.config_id === monitor?.[ConfigKey.CONFIG_ID] ||
    latestPing?.monitor?.id === monitor?.[ConfigKey.MONITOR_QUERY_ID];

  if (!monitor || !isPingRelevant) {
    return <EuiSkeletonText lines={6} />;
  }

  return (
    <MonitorDetailsPanel
      latestPing={latestPing}
      monitor={monitor}
      loading={loading}
      configId={configId}
      {...props}
    />
  );
};
