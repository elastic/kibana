/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import {
  MonitorDetailsPanelProps,
  MonitorDetailsPanel,
} from '../../common/components/monitor_details_panel';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useMonitorLatestPing } from '../hooks/use_monitor_latest_ping';

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
