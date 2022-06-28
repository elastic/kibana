/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AvailabilityPanel } from './availability_panel';
import { MonitorDetailsPanel } from './monitor_details_panel';

export const SummaryTabContent = () => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiPanel>
          <EuiTitle size="s">
            <h3>{MONITOR_DETAILS_LABEL}</h3>
          </EuiTitle>
          <MonitorDetailsPanel />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EuiFlexGroup>
          <EuiFlexItem style={{ width: 200, height: 150 }}>
            <EuiPanel style={{ width: 200, height: 200 }}>
              <EuiTitle size="xs">
                <h3>{LAST_30DAYS_LABEL}</h3>
              </EuiTitle>
              <AvailabilityPanel />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const MONITOR_DETAILS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails', {
  defaultMessage: 'Monitor details',
});

const LAST_30DAYS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.last30Days', {
  defaultMessage: 'Last 30 days',
});
