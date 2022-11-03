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
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useEarliestStartDate } from '../hooks/use_earliest_start_data';
import { MonitorErrorSparklines } from './monitor_error_sparklines';
import { DurationSparklines } from './duration_sparklines';
import { MonitorDurationTrend } from './duration_trend';
import { StepDurationPanel } from './step_duration_panel';
import { AvailabilityPanel } from './availability_panel';
import { DurationPanel } from './duration_panel';
import { MonitorDetailsPanel } from './monitor_details_panel';
import { AvailabilitySparklines } from './availability_sparklines';
import { LastTestRun } from './last_test_run';
import { TestRunsTable } from './test_runs_table';
import { MonitorErrorsCount } from './monitor_errors_count';

export const MonitorSummary = () => {
  const { from, loading } = useEarliestStartDate();
  const to = 'now';

  if (loading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const dateLabel = from === 'now-30d/d' ? LAST_30_DAYS_LABEL : TO_DATE_LABEL;

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={1}>
          <EuiPanel hasShadow={false} hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>{MONITOR_DETAILS_LABEL}</h3>
            </EuiTitle>
            <MonitorDetailsPanel />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder paddingSize="m" css={{ height: 158 }}>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>{SUMMARY_LABEL}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {dateLabel}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <AvailabilityPanel from={from} to={to} />
              </EuiFlexItem>
              <EuiFlexItem>
                <AvailabilitySparklines from={from} to={to} />
              </EuiFlexItem>
              <EuiFlexItem>
                <DurationPanel from={from} to={to} />
              </EuiFlexItem>
              <EuiFlexItem>
                <DurationSparklines from={from} to={to} />
              </EuiFlexItem>
              <EuiFlexItem>
                <MonitorErrorsCount from={from} to={to} />
              </EuiFlexItem>
              <EuiFlexItem>
                <MonitorErrorSparklines from={from} to={to} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiPanel hasShadow={false} paddingSize="m" hasBorder>
                <EuiFlexGroup alignItems="center" gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>{DURATION_TREND_LABEL}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText color="subdued" size="s">
                      {dateLabel}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <MonitorDurationTrend from={from} to={to} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* <EuiSpacer size="l" /> */}
      {/* <EuiPanel style={{ height: 100 }}>/!* TODO: Add status panel*!/</EuiPanel> */}
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <LastTestRun />
        </EuiFlexItem>
        <EuiFlexItem>
          <StepDurationPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <TestRunsTable paginable={false} from={from} to={to} />
    </>
  );
};

const MONITOR_DETAILS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails', {
  defaultMessage: 'Monitor details',
});

const SUMMARY_LABEL = i18n.translate('xpack.synthetics.detailsPanel.summary', {
  defaultMessage: 'Summary',
});

const TO_DATE_LABEL = i18n.translate('xpack.synthetics.detailsPanel.toDate', {
  defaultMessage: 'To date',
});

const DURATION_TREND_LABEL = i18n.translate('xpack.synthetics.detailsPanel.durationTrends', {
  defaultMessage: 'Duration trends',
});

const LAST_30_DAYS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.last30Days', {
  defaultMessage: 'Last 30 days',
});
