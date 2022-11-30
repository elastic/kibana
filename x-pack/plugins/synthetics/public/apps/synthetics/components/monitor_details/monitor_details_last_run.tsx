/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import { EuiDescriptionList, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';

export const MonitorDetailsLastRun: React.FC = () => {
  const { monitor } = useSelectedMonitor();
  const { latestPing, loading: pingsLoading } = useMonitorLatestPing();

  if (!monitor) {
    return null;
  }

  const description = pingsLoading ? (
    <EuiLoadingSpinner size="s" />
  ) : latestPing ? (
    moment(latestPing.timestamp).fromNow()
  ) : (
    '--'
  );

  return <EuiDescriptionList listItems={[{ title: LAST_RUN_LABEL, description }]} />;
};

const LAST_RUN_LABEL = i18n.translate('xpack.synthetics.monitorLastRun.lastRunLabel', {
  defaultMessage: 'Last run',
});
