/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useMonitorDetailsPage } from '../use_monitor_details_page';
import { useRefreshedRangeFromUrl, useUrlParams } from '../../../hooks';
import { useDimensions } from '../../../hooks';
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
import { MonitorStatusPanel } from '../monitor_status/monitor_status_panel';
import { MonitorPendingWrapper } from '../monitor_pending_wrapper';

const STATS_WIDTH_SINGLE_COLUMN_THRESHOLD = 360; // ✨ determined by trial and error

export const MonitorHistory = () => {
  const [, updateUrlParams] = useUrlParams();
  const { from, to } = useRefreshedRangeFromUrl();

  const { elementRef: statsRef, width: statsWidth } = useDimensions<HTMLDivElement>();
  const statsColumns = statsWidth && statsWidth < STATS_WIDTH_SINGLE_COLUMN_THRESHOLD ? 1 : 2;

  const handleStatusChartBrushed = useCallback(
    ({ fromUtc, toUtc }: any) => {
      updateUrlParams({ dateRangeStart: fromUtc, dateRangeEnd: toUtc });
    },
    [updateUrlParams]
  );

  const redirect = useMonitorDetailsPage();
  if (redirect) {
    return redirect;
  }

  return (
    <MonitorPendingWrapper>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <SyntheticsDatePicker fullWidth={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m" wrap={true}>
            <EuiFlexItem css={{ flexBasis: '36%' }}>
              {/* @ts-expect-error Current @elastic/eui has the wrong types for the ref */}
              <EuiPanel hasShadow={false} hasBorder={true} panelRef={statsRef}>
                <EuiTitle size="xs">
                  <h3>{STATS_LABEL}</h3>
                </EuiTitle>
                <EuiFlexGrid columns={statsColumns} gutterSize="s" responsive={false}>
                  <EuiFlexItem>
                    <EuiFlexGroup gutterSize="xs">
                      <EuiFlexItem>
                        <MonitorCompleteCount from={from} to={to} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <MonitorCompleteSparklines from={from} to={to} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup gutterSize="xs">
                      <EuiFlexItem>
                        <AvailabilityPanel from={from} to={to} id="availabilityPercentageHistory" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <AvailabilitySparklines
                          from={from}
                          to={to}
                          id="availabilitySparklineHistory"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup gutterSize="xs">
                      <EuiFlexItem>
                        <MonitorErrorsCount from={from} to={to} id="monitorErrorsCountHistory" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <MonitorErrorSparklines
                          from={from}
                          to={to}
                          id="monitorErrorsSparklineHistory"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup gutterSize="xs">
                      <EuiFlexItem>
                        <DurationPanel from={from} to={to} id="durationAvgValueHistory" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <DurationSparklines from={from} to={to} id="durationAvgSparklineHistory" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <MonitorTotalRunsCount from={from} to={to} />
                  </EuiFlexItem>
                </EuiFlexGrid>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem css={{ flexBasis: '60%', minWidth: 260 }}>
              <EuiPanel hasShadow={false} hasBorder={true}>
                <EuiTitle size="xs">
                  <h3>{DURATION_TREND_LABEL}</h3>
                </EuiTitle>
                <MonitorDurationTrend from={from} to={to} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <MonitorStatusPanel
            from={from}
            to={to}
            showViewHistoryButton={false}
            periodCaption={''}
            brushable={true}
            onBrushed={handleStatusChartBrushed}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <TestRunsTable from={from} to={to} showViewHistoryButton={false} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </MonitorPendingWrapper>
  );
};

const STATS_LABEL = i18n.translate('xpack.synthetics.historyPanel.stats', {
  defaultMessage: 'Stats',
});

const DURATION_TREND_LABEL = i18n.translate('xpack.synthetics.historyPanel.durationTrends', {
  defaultMessage: 'Duration trends',
});
