/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DurationSparklines } from './duration_sparklines';
import { MonitorDurationTrend } from './duration_trend';
import { StepDurationPanel } from './step_duration_panel';
import { AvailabilityPanel } from './availability_panel';
import { DurationPanel } from './duration_panel';
import { MonitorDetailsPanel } from './monitor_details_panel';
import { AvailabilitySparklines } from './availability_sparklines';
import { LastTestRun } from './last_test_run';
import { LastTenTestRuns } from './last_ten_test_runs';
import { MonitorErrorsCount } from './monitor_errors_count';

export const MonitorSummary = () => {
  const { euiTheme } = useEuiTheme();

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
          <EuiPanel css={{ padding: euiTheme.size.s, height: 158 }}>
            <EuiTitle size="xs">
              <h3 css={{ margin: euiTheme.size.s, marginBottom: 0 }}>{LAST_30DAYS_LABEL}</h3>
            </EuiTitle>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem>
                <AvailabilityPanel />
              </EuiFlexItem>
              <EuiFlexItem>
                <AvailabilitySparklines />
              </EuiFlexItem>
              <EuiFlexItem>
                <DurationPanel />
              </EuiFlexItem>
              <EuiFlexItem>
                <DurationSparklines />
              </EuiFlexItem>
              <EuiFlexItem>
                <MonitorErrorsCount />
              </EuiFlexItem>
              <EuiFlexItem>{/* TODO: Add error sparkline*/}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
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
      <EuiSpacer size="l" />
      {/* <EuiPanel style={{ height: 100 }}>/!* TODO: Add status panel*!/</EuiPanel> */}
      {/* <EuiSpacer size="l" /> */}
      <EuiFlexGroup>
        <EuiFlexItem>
          <LastTestRun />
        </EuiFlexItem>
        <EuiFlexItem>
          <StepDurationPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <LastTenTestRuns />
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
