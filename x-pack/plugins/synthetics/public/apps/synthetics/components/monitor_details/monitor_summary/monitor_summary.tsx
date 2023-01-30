/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LoadWhenInView } from '@kbn/observability-plugin/public';

import { MonitorAlerts } from './monitor_alerts';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useEarliestStartDate } from '../hooks/use_earliest_start_date';
import { MonitorErrorSparklines } from './monitor_error_sparklines';
import { MonitorStatusPanel } from '../monitor_status/monitor_status_panel';
import { DurationSparklines } from './duration_sparklines';
import { MonitorDurationTrend } from './duration_trend';
import { StepDurationPanel } from './step_duration_panel';
import { AvailabilityPanel } from './availability_panel';
import { DurationPanel } from './duration_panel';
import { MonitorDetailsPanelContainer } from './monitor_details_panel';
import { AvailabilitySparklines } from './availability_sparklines';
import { LastTestRun } from './last_test_run';
import { LAST_10_TEST_RUNS, TestRunsTable } from './test_runs_table';
import { MonitorErrorsCount } from './monitor_errors_count';
import { useAbsoluteDate } from '../../../hooks';

export const MonitorSummary = () => {
  const { from: fromRelative } = useEarliestStartDate();
  const toRelative = 'now';

  const { from, to } = useAbsoluteDate({ from: fromRelative, to: toRelative });

  const monitorId = useMonitorQueryId();

  const dateLabel = from === 'now-30d/d' ? LAST_30_DAYS_LABEL : TO_DATE_LABEL;

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={1}>
          <MonitorDetailsPanelContainer />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder paddingSize="m" css={{ height: 120 }}>
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
              <EuiFlexItem grow={false}>
                <AvailabilityPanel from={from} to={to} />
              </EuiFlexItem>
              <EuiFlexItem>
                <AvailabilitySparklines from={from} to={to} />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ marginLeft: 40 }}>
                <DurationPanel from={from} to={to} />
              </EuiFlexItem>
              <EuiFlexItem>
                <DurationSparklines from={from} to={to} />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ marginLeft: 40 }}>
                {monitorId && <MonitorErrorsCount from={from} to={to} monitorId={[monitorId]} />}
              </EuiFlexItem>
              <EuiFlexItem>
                {monitorId && (
                  <MonitorErrorSparklines from={from} to={to} monitorId={[monitorId]} />
                )}
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
      <EuiSpacer size="m" />
      <MonitorStatusPanel
        from={'now-24h'}
        to={'now'}
        brushable={false}
        showViewHistoryButton={true}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <LastTestRun />
        </EuiFlexItem>
        <EuiFlexItem>
          <MonitorAlerts dateLabel={dateLabel} from={from} to={to} />
          <EuiSpacer size="m" />
          <StepDurationPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <LoadWhenInView placeholderTitle={LAST_10_TEST_RUNS}>
        <TestRunsTable paginable={false} from={from} to={to} />
      </LoadWhenInView>
    </>
  );
};

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
