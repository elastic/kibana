/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { StepDurationPanel } from './step_duration_panel';
import { MonitorDetailsPanel } from './monitor_details_panel';

export const SummaryTabContent = () => {
  return (
    <>
      <EuiPanel>
        <EuiTitle size="s">
          <h3>{MONITOR_DETAILS_LABEL}</h3>
        </EuiTitle>
        <MonitorDetailsPanel />
      </EuiPanel>
      <EuiSpacer />
      <StepDurationPanel />
    </>
  );
};

const MONITOR_DETAILS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails', {
  defaultMessage: 'Monitor details',
});
