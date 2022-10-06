/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiDescriptionList, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTheme } from '@kbn/observability-plugin/public';

import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';

export const MonitorDetailsStatus: React.FC = () => {
  const theme = useTheme();
  const { latestPing, loading: pingsLoading } = useMonitorLatestPing();

  const { monitor } = useSelectedMonitor();

  if (!monitor) {
    return null;
  }

  const isBrowserType = monitor.type === 'browser';

  const badge = pingsLoading ? (
    <EuiLoadingSpinner size="s" />
  ) : !latestPing ? (
    <EuiBadge color="default">{PENDING_LABEL}</EuiBadge>
  ) : latestPing.monitor.status === 'up' ? (
    <EuiBadge color={theme.eui.euiColorVis0}>{isBrowserType ? SUCCESS_LABEL : UP_LABEL}</EuiBadge>
  ) : (
    <EuiBadge color={theme.eui.euiColorVis9}>{isBrowserType ? FAILED_LABEL : DOWN_LABEL}</EuiBadge>
  );

  return <EuiDescriptionList listItems={[{ title: STATUS_LABEL, description: badge }]} />;
};

const STATUS_LABEL = i18n.translate('xpack.synthetics.monitorStatus.statusLabel', {
  defaultMessage: 'Status',
});

const FAILED_LABEL = i18n.translate('xpack.synthetics.monitorStatus.failedLabel', {
  defaultMessage: 'Failed',
});

const PENDING_LABEL = i18n.translate('xpack.synthetics.monitorStatus.pendingLabel', {
  defaultMessage: 'Pending',
});

const SUCCESS_LABEL = i18n.translate('xpack.synthetics.monitorStatus.succeededLabel', {
  defaultMessage: 'Succeeded',
});

const UP_LABEL = i18n.translate('xpack.synthetics.monitorStatus.upLabel', {
  defaultMessage: 'Up',
});

const DOWN_LABEL = i18n.translate('xpack.synthetics.monitorStatus.downLabel', {
  defaultMessage: 'Down',
});
