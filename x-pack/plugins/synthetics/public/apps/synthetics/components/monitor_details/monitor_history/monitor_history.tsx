/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useGetUrlParams } from '../../../hooks';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { AvailabilityPanel } from '../monitor_summary/availability_panel';
import { DurationPanel } from '../monitor_summary/duration_panel';
import { MonitorDurationTrend } from '../monitor_summary/duration_trend';
import { TestRunsTable } from '../monitor_summary/test_runs_table';
import { MonitorErrorsCount } from '../monitor_summary/monitor_errors_count';
import { MonitorCompleteCount } from '../monitor_summary/monitor_complete_count';
import { MonitorTotalRunsCount } from '../monitor_summary/monitor_total_runs_count';
import { MonitorErrorSparklines } from '../monitor_summary/monitor_error_sparklines';
import { AvailabilitySparklines } from '../monitor_summary/availability_sparklines';
import { DurationSparklines } from '../monitor_summary/duration_sparklines';
import { MonitorCompleteSparklines } from '../monitor_summary/monitor_complete_sparklines';

export const MonitorHistory = () => {
  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <SyntheticsDatePicker fullWidth={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={1}>
            <EuiPanel hasShadow={false} hasBorder={true}>
              <EuiTitle size="xs">
                <h3>{STATS_LABEL}</h3>
              </EuiTitle>
              <EuiFlexGrid columns={2} gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem>
                      <MonitorCompleteCount from={dateRangeStart} to={dateRangeEnd} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <MonitorCompleteSparklines from={dateRangeStart} to={dateRangeEnd} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem>
                      <AvailabilityPanel from={dateRangeStart} to={dateRangeEnd} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <AvailabilitySparklines from={dateRangeStart} to={dateRangeEnd} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem>
                      <MonitorErrorsCount from={dateRangeStart} to={dateRangeEnd} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <MonitorErrorSparklines from={dateRangeStart} to={dateRangeEnd} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem>
                      <DurationPanel from={dateRangeStart} to={dateRangeEnd} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <DurationSparklines from={dateRangeStart} to={dateRangeEnd} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <MonitorTotalRunsCount from={dateRangeStart} to={dateRangeEnd} />
                </EuiFlexItem>
              </EuiFlexGrid>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiPanel hasShadow={false} hasBorder={true}>
              <EuiTitle size="xs">
                <h3>{DURATION_TREND_LABEL}</h3>
              </EuiTitle>
              <MonitorDurationTrend from={dateRangeStart} to={dateRangeEnd} />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder={true}>
          <EuiTitle size="xs">
            <h3>{STATUS_LABEL}</h3>
          </EuiTitle>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <TestRunsTable from={dateRangeStart} to={dateRangeEnd} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const STATS_LABEL = i18n.translate('xpack.synthetics.historyPanel.stats', {
  defaultMessage: 'Stats',
});

const DURATION_TREND_LABEL = i18n.translate('xpack.synthetics.historyPanel.durationTrends', {
  defaultMessage: 'Duration trends',
});

const STATUS_LABEL = i18n.translate('xpack.synthetics.historyPanel.status', {
  defaultMessage: 'Status',
});
