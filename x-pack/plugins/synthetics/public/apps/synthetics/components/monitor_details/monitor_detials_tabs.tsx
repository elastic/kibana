/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ErrorsTabContent } from './monitor_errors/monitor_errors';
import { HistoryTabContent } from './monitor_history/monitor_history';
import { MonitorSummary } from './monitor_summary/monitor_summary';

export const MonitorDetailsTabs = () => {
  const tabs = [
    {
      id: 'summary',
      name: SUMMARY_LABEL,
      content: (
        <>
          <EuiSpacer />
          <MonitorSummary />
        </>
      ),
    },
    {
      id: 'history',
      name: HISTORY_LABEL,
      content: (
        <>
          <EuiSpacer />
          <HistoryTabContent />
        </>
      ),
    },
    {
      id: 'errors',
      name: ERRORS_LABEL,
      prepend: <EuiIcon type="alert" color="danger" />,
      content: (
        <>
          <EuiSpacer />
          <ErrorsTabContent />
        </>
      ),
    },
  ];

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      onTabClick={(tab) => {}}
    />
  );
};

const SUMMARY_LABEL = i18n.translate('xpack.synthetics.monitorSummary.summary', {
  defaultMessage: 'Summary',
});

const HISTORY_LABEL = i18n.translate('xpack.synthetics.monitorSummary.history', {
  defaultMessage: 'History',
});

const ERRORS_LABEL = i18n.translate('xpack.synthetics.monitorSummary.errors', {
  defaultMessage: 'Errors',
});
