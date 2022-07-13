/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { MonitorDurationTrend } from './duration_trend';
import { StepDurationPanel } from './step_duration_panel';
import { AvailabilityPanel } from './availability_panel';
import { MonitorDetailsPanel } from './monitor_details_panel';

export const SummaryTabContent = () => {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiPanel>
            <EuiTitle size="xs">
              <h3>{MONITOR_DETAILS_LABEL}</h3>
            </EuiTitle>
            <MonitorDetailsPanel />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel style={{ paddingBottom: 0 }}>
            <EuiTitle size="xs">
              <h3>{LAST_30DAYS_LABEL}</h3>
            </EuiTitle>
            <EuiFlexGroup>
              <EuiFlexItem>
                <AvailabilityPanel />
              </EuiFlexItem>
              <EuiFlexItem>{/* TODO: Add availability sparkline*/}</EuiFlexItem>
              <EuiFlexItem>{/* TODO: Add duration metric*/}</EuiFlexItem>
              <EuiFlexItem>{/* TODO: Add duration metric sparkline*/}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="s">
                      <h3>{DURATION_TREND_LABEL}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText color="subdued" size="s">
                      {LAST_30_DAYS_LABEL}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <MonitorDurationTrend />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiPanel style={{ height: 100 }}>{/* TODO: Add status panel*/}</EuiPanel>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel>{/* TODO: Add last run panel*/}</EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <StepDurationPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const MONITOR_DETAILS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails', {
  defaultMessage: 'Monitor details',
});

const LAST_30DAYS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.last30Days', {
  defaultMessage: 'Last 30 days',
});

const DURATION_TREND_LABEL = i18n.translate('xpack.synthetics.detailsPanel.durationTrends', {
  defaultMessage: 'Duration trends',
});

const LAST_30_DAYS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.last30Days', {
  defaultMessage: 'Last 30 days',
});
