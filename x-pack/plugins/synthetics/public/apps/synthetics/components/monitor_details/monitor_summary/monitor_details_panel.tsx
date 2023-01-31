/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingContent } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { MonitorDetailsPanel } from '../../common/components/monitor_details_panel';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useMonitorLatestPing } from '../hooks/use_monitor_latest_ping';

export const MonitorDetailsPanelContainer = () => {
  const { latestPing } = useMonitorLatestPing();

  const { monitorId: configId } = useParams<{ monitorId: string }>();

  const { monitor, loading } = useSelectedMonitor();

  if (
    (latestPing && latestPing?.config_id !== configId) ||
    (monitor && monitor[ConfigKey.CONFIG_ID] !== configId)
  ) {
    return <EuiLoadingContent lines={6} />;
  }

  return (
    <MonitorDetailsPanel
      latestPing={latestPing}
      monitor={monitor}
      loading={loading}
      configId={configId}
    />
  );
};

export const WrapperStyle = euiStyled.div`
  .euiDescriptionList.euiDescriptionList--column > *,
  .euiDescriptionList.euiDescriptionList--responsiveColumn > * {
    margin-top: ${({ theme }) => theme.eui.euiSizeS};
  }
`;
