/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  dateFormatAliases,
  EuiBasicTable,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiTitle,
  EuiToolTip,
  formatDate,
} from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT, CENTER_ALIGNMENT } from '@elastic/eui/lib/services';
import { chunk, sortBy } from 'lodash';
import {
  Axis,
  BarSeries,
  Chart,
  CurveType,
  Fit,
  LineSeries,
  niceTimeFormatByDay,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { RuleExecutionSummary, ActionExecutionSummary } from '../../../../../../alerting/common';
import {
  Alert as Rule,
  RuleMonitoringSummary as RuleMonitoringSummaryInterface,
  AlertType as RuleType,
  Pagination,
} from '../../../../types';
import { DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';
import './alert_instances.scss';

interface RuleMonitoringSummaryProps {
  rule: Rule;
  ruleType: RuleType;
  ruleMonitoringSummary: RuleMonitoringSummaryInterface;
  durationEpoch?: number;
}

const ONE_MILLISECOND_AS_NANOSECONDS = 1000000;
const ONE_SECOND = 1000;
const ONE_MINUTE = 60000;
const ONE_HOUR = 3600000;

const milliseconds = (duration: moment.Duration): string =>
  Number.isInteger(duration.milliseconds())
    ? `${duration.milliseconds()}ms`
    : `${duration.milliseconds().toFixed(2)}ms`; // nanosecond precision
const seconds = (duration: moment.Duration): string => `${duration.seconds().toFixed(2)}s`;
const minutes = (duration: moment.Duration): string =>
  `${duration.minutes()}m ${seconds(duration)}`;
const hours = (duration: moment.Duration): string => `${duration.hours()}h ${minutes(duration)}`;

function formatNanoseconds(nanos: string) {
  const totalNanoseconds = Number(nanos);

  const duration = moment.duration(totalNanoseconds / ONE_MILLISECOND_AS_NANOSECONDS);
  const totalMs = duration.asMilliseconds();

  if (totalMs < ONE_SECOND) {
    return milliseconds(duration);
  } else if (totalMs < ONE_MINUTE) {
    return seconds(duration);
  } else if (totalMs < ONE_HOUR) {
    return minutes(duration);
  } else {
    return hours(duration);
  }
}

function formatBarChart(executions: RuleExecutionSummary[], actions: ActionExecutionSummary[]) {
  let barData = [];
  for (const execution of executions) {
    if (execution.outcome === 'success') {
      barData.push({
        key: execution.start,
        successfulExecution: execution.duration,
      });
    } else if (execution.outcome === 'failure') {
      barData.push({
        key: execution.start,
        failedExecution: execution.duration,
      });
    }
  }

  for (const action of actions) {
    if (action.outcome === 'success') {
      barData.push({
        key: action.start,
        successfulAction: action.duration,
      });
    } else if (action.outcome === 'failure') {
      barData.push({
        key: action.start,
        failedAction: action.duration,
      });
    }
  }
  barData = sortBy(barData, ['key']);
  return barData;
}
export function RuleMonitoringSummary({
  rule,
  ruleType,
  ruleMonitoringSummary,
  durationEpoch = Date.now(),
}: RuleMonitoringSummaryProps) {
  const [executionPagination, setExecutionPagination] = useState<Pagination>({
    index: 0,
    size: DEFAULT_SEARCH_PAGE_SIZE,
  });
  const [actionPagination, setActionPagination] = useState<Pagination>({
    index: 0,
    size: DEFAULT_SEARCH_PAGE_SIZE,
  });

  const pageOfExecutions = getPage(ruleMonitoringSummary.executions, executionPagination);
  const pageOfActions = getPage(ruleMonitoringSummary.actions, actionPagination);
  const formattedData = formatBarChart(
    ruleMonitoringSummary.executions,
    ruleMonitoringSummary.actions
  );

  return (
    <>
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder={true} grow={false}>
            <EuiStat
              title={(ruleMonitoringSummary.num_successful_executions ?? 0).toString()}
              description="# Successful Executions"
            />
            <EuiSpacer size="s" />
            <EuiStat
              title={(ruleMonitoringSummary.num_failed_executions ?? 0).toString()}
              description="# Failed Executions"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder={true} grow={false}>
            <EuiStat
              title={ruleMonitoringSummary.num_successful_actions.toString()}
              description="# Successful Actions"
            />
            <EuiSpacer size="s" />
            <EuiStat
              title={ruleMonitoringSummary.num_failed_actions.toString()}
              description="# Failed Actions"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder={true} grow={false}>
            <EuiStat
              title={(ruleMonitoringSummary.num_alerts ?? 0).toString()}
              description="# Alerts"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <EuiPanel hasBorder={true}>
            <EuiBasicTable
              items={[
                {
                  lastDateTitle: 'Last successful execution',
                  lastDateTime:
                    ruleMonitoringSummary.executions.find(
                      (execution: RuleExecutionSummary) => execution.outcome === 'success'
                    )?.start ?? '--',
                },
                {
                  lastDateTitle: 'Last failed execution',
                  lastDateTime:
                    ruleMonitoringSummary.executions.find(
                      (execution: RuleExecutionSummary) => execution.outcome === 'failure'
                    )?.start ?? '--',
                },
                {
                  lastDateTitle: 'Last successful action',
                  lastDateTime:
                    ruleMonitoringSummary.actions.find(
                      (action: ActionExecutionSummary) => action.outcome === 'success'
                    )?.start ?? '--',
                },
                {
                  lastDateTitle: 'Last failed execution',
                  lastDateTime:
                    ruleMonitoringSummary.actions.find(
                      (action: ActionExecutionSummary) => action.outcome === 'success'
                    )?.start ?? '--',
                },
              ]}
              rowProps={() => ({
                'data-test-subj': 'action-row',
              })}
              cellProps={() => ({
                'data-test-subj': 'cell',
              })}
              columns={[
                {
                  field: 'lastDateTitle',
                  name: '',
                  sortable: false,
                  truncateText: true,
                  render: (value: string) => {
                    return <span>{value}</span>;
                  },
                },
                {
                  field: 'lastDateTime',
                  name: '',
                  render: (value: string) => {
                    return <span>{value}</span>;
                  },
                  sortable: false,
                },
              ]}
              tableLayout="fixed"
              className="executionSummaryList"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      <EuiFlexGrid gutterSize="l" columns={4} />
      <EuiSpacer size="xl" />
      <EuiFlexGrid gutterSize="l" columns={1}>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <Chart size={{ height: 200 }}>
              <Settings
                theme={EUI_CHARTS_THEME_LIGHT.theme}
                showLegend={true}
                legendPosition="right"
              />
              <BarSeries
                id="rule_success"
                name="Rule executions (success)"
                data={formattedData}
                xScaleType="time"
                xAccessor={'key'}
                yAccessors={['successfulExecution']}
                yScaleType="linear"
              />
              <BarSeries
                id="rule_failure"
                name="Rule executions (failed)"
                data={formattedData}
                xScaleType="time"
                xAccessor={'key'}
                yAccessors={['failedExecution']}
                yScaleType="linear"
              />
              <BarSeries
                id="action_success"
                name="Action executions (success)"
                data={formattedData}
                xScaleType="time"
                xAccessor={'key'}
                yAccessors={['successfulAction']}
                yScaleType="linear"
              />
              <BarSeries
                id="action_failure"
                name="Action executions (failed)"
                data={formattedData}
                xScaleType="time"
                xAccessor={'key'}
                yAccessors={['failedAction']}
                yScaleType="linear"
              />
              <Axis
                title={formatDate(Date.now(), dateFormatAliases.date)}
                id="bottom-axis"
                position="bottom"
                tickFormat={timeFormatter(niceTimeFormatByDay(1))}
              />
              <Axis
                id="left-axis"
                position="left"
                showGridLines
                tickFormat={(d) => formatNanoseconds(d)}
              />
            </Chart>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="xl" />
      <EuiFlexGrid gutterSize="l" columns={2}>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <EuiTitle size="s">
              <h3>Rule Executions</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGrid gutterSize="s" columns={2}>
              <EuiFlexItem>
                <EuiPanel hasBorder={true}>
                  <EuiStat
                    title={formatNanoseconds((ruleMonitoringSummary.avg_duration ?? 0).toString())}
                    description="Average execution duration"
                  />
                  <EuiSpacer size="l" />
                  <Chart size={{ height: 200 }}>
                    <Settings
                      theme={{
                        areaSeriesStyle: {
                          point: {
                            visible: false,
                          },
                        },
                        lineSeriesStyle: {
                          point: {
                            visible: false,
                          },
                        },
                      }}
                    />
                    <LineSeries
                      id="rule_duration"
                      xScaleType="time"
                      yScaleType="linear"
                      xAccessor={0}
                      yAccessors={[1]}
                      data={ruleMonitoringSummary.executions
                        .reverse()
                        .map((execution) => [execution.start, execution.duration])}
                      fit={Fit.Linear}
                      curve={CurveType.CURVE_NATURAL}
                    />
                    <LineSeries
                      id="rule_duration_avg"
                      xScaleType="time"
                      yScaleType="linear"
                      xAccessor={0}
                      yAccessors={[1]}
                      data={ruleMonitoringSummary.executions
                        .reverse()
                        .map((execution) => [execution.start, ruleMonitoringSummary.avg_duration])}
                      curve={CurveType.CURVE_NATURAL}
                    />
                    <Axis
                      title={formatDate(Date.now(), dateFormatAliases.date)}
                      id="bottom-axis"
                      position="bottom"
                      tickFormat={timeFormatter(niceTimeFormatByDay(1))}
                    />
                    <Axis
                      id="left-axis"
                      position="left"
                      showGridLines
                      tickFormat={(d) => formatNanoseconds(d)}
                    />
                  </Chart>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder={true}>
                  <EuiStat
                    title={formatNanoseconds((ruleMonitoringSummary.avg_delay ?? 0).toString())}
                    description="Average execution delay"
                  />
                  <EuiSpacer size="l" />
                  <Chart size={{ height: 200 }}>
                    <Settings
                      theme={{
                        areaSeriesStyle: {
                          point: {
                            visible: false,
                          },
                        },
                        lineSeriesStyle: {
                          point: {
                            visible: false,
                          },
                        },
                      }}
                    />
                    <LineSeries
                      id="rule_delay"
                      xScaleType="time"
                      yScaleType="linear"
                      xAccessor={0}
                      yAccessors={[1]}
                      data={ruleMonitoringSummary.executions
                        .reverse()
                        .map((execution) => [execution.start, execution.delay])}
                      fit={Fit.Linear}
                      curve={CurveType.CURVE_NATURAL}
                    />
                    <LineSeries
                      id="rule_duration_avg"
                      xScaleType="time"
                      yScaleType="linear"
                      xAccessor={0}
                      yAccessors={[1]}
                      data={ruleMonitoringSummary.executions
                        .reverse()
                        .map((execution) => [execution.start, ruleMonitoringSummary.avg_delay])}
                      curve={CurveType.CURVE_NATURAL}
                    />
                    <Axis
                      title={formatDate(Date.now(), dateFormatAliases.date)}
                      id="bottom-axis"
                      position="bottom"
                      tickFormat={timeFormatter(niceTimeFormatByDay(1))}
                    />
                    <Axis
                      id="left-axis"
                      position="left"
                      showGridLines
                      tickFormat={(d) => formatNanoseconds(d)}
                    />
                  </Chart>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGrid>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items={pageOfExecutions}
              pagination={{
                pageIndex: executionPagination.index,
                pageSize: executionPagination.size,
                totalItemCount: ruleMonitoringSummary.executions.length,
              }}
              onChange={({ page: changedPage }: { page: Pagination }) => {
                setExecutionPagination(changedPage);
              }}
              rowProps={() => ({
                'data-test-subj': 'execution-row',
              })}
              cellProps={() => ({
                'data-test-subj': 'cell',
              })}
              columns={[
                {
                  field: 'start',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleExecutionList.columns.start',
                    { defaultMessage: 'Execution start' }
                  ),
                  sortable: false,
                  truncateText: true,
                  'data-test-subj': 'ruleExecutionsTableCell-start',
                  render: (value: string) => {
                    return <span>{value}</span>;
                  },
                },
                {
                  field: 'duration',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleExecutionList.columns.duration',
                    { defaultMessage: 'Duration' }
                  ),
                  render: (value: string) => {
                    return value ? formatNanoseconds(value) : '';
                  },
                  sortable: false,
                  'data-test-subj': 'ruleExecutionsTableCell-duration',
                },
                {
                  field: 'delay',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleExecutionList.columns.delay',
                    { defaultMessage: 'Delay' }
                  ),
                  render: (value: string) => {
                    return value ? formatNanoseconds(value) : '';
                  },
                  sortable: false,
                  'data-test-subj': 'ruleExecutionsTableCell-delay',
                },
                {
                  field: 'outcome',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleExecutionList.columns.outcome',
                    { defaultMessage: 'Outcome' }
                  ),
                  render: (value: string, item: RuleExecutionSummary) => {
                    return value === 'failure' ? (
                      <EuiToolTip content={item.error_message}>
                        <span>{value}</span>
                      </EuiToolTip>
                    ) : (
                      <span>{value}</span>
                    );
                  },
                  sortable: false,
                  'data-test-subj': 'ruleExecutionsTableCell-outcome',
                },
                {
                  field: 'num_recovered_alerts',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleExecutionList.columns.num_recovered_alerts',
                    { defaultMessage: '# Recovered Alerts' }
                  ),
                  render: (value: number) => {
                    return <span>{value}</span>;
                  },
                  sortable: false,
                  'data-test-subj': 'ruleExecutionsTableCell-num_recovered_alerts',
                },
                {
                  field: 'num_active_alerts',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleExecutionList.columns.num_active_alerts',
                    { defaultMessage: '# Active Alerts' }
                  ),
                  render: (value: number) => {
                    return <span>{value}</span>;
                  },
                  sortable: false,
                  'data-test-subj': 'ruleExecutionsTableCell-num_active_alerts',
                },
                {
                  field: 'num_new_alerts',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleExecutionList.columns.num_new_alerts',
                    { defaultMessage: '# New Alerts' }
                  ),
                  render: (value: number) => {
                    return <span>{value}</span>;
                  },
                  sortable: false,
                  'data-test-subj': 'ruleExecutionsTableCell-num_new_alerts',
                },
              ]}
              data-test-subj="ruleExecutionList"
              tableLayout="fixed"
              className="ruleExecutionList"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <EuiTitle size="s">
              <h3>Action Executions</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGrid gutterSize="s" columns={2}>
              <EuiFlexItem>
                <EuiPanel hasBorder={true}>
                  <EuiStat
                    title={formatNanoseconds(
                      (ruleMonitoringSummary.avg_action_duration ?? 0).toString()
                    )}
                    description="Average action duration"
                  />
                  <EuiSpacer size="l" />
                  <Chart size={{ height: 200 }}>
                    <Settings
                      theme={{
                        areaSeriesStyle: {
                          point: {
                            visible: false,
                          },
                        },
                        lineSeriesStyle: {
                          point: {
                            visible: false,
                          },
                        },
                      }}
                    />
                    <LineSeries
                      id="action_duration"
                      xScaleType="time"
                      yScaleType="linear"
                      xAccessor={0}
                      yAccessors={[1]}
                      data={ruleMonitoringSummary.actions
                        .reverse()
                        .map((action) => [action.start, action.duration])}
                      fit={Fit.Linear}
                      curve={CurveType.CURVE_NATURAL}
                    />
                    <LineSeries
                      id="action_duration_avg"
                      xScaleType="time"
                      yScaleType="linear"
                      xAccessor={0}
                      yAccessors={[1]}
                      data={ruleMonitoringSummary.actions
                        .reverse()
                        .map((action) => [
                          action.start,
                          ruleMonitoringSummary.avg_action_duration ?? 0,
                        ])}
                      curve={CurveType.CURVE_NATURAL}
                    />
                    <Axis
                      title={formatDate(Date.now(), dateFormatAliases.date)}
                      id="bottom-axis"
                      position="bottom"
                      tickFormat={timeFormatter(niceTimeFormatByDay(1))}
                    />
                    <Axis
                      id="left-axis"
                      position="left"
                      showGridLines
                      tickFormat={(d) => formatNanoseconds(d)}
                    />
                  </Chart>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder={true}>
                  <EuiStat
                    title={formatNanoseconds(
                      (ruleMonitoringSummary.avg_action_delay ?? 0).toString()
                    )}
                    description="Average action delay"
                  />
                  <EuiSpacer size="l" />
                  <Chart size={{ height: 200 }}>
                    <Settings
                      theme={{
                        areaSeriesStyle: {
                          point: {
                            visible: false,
                          },
                        },
                        lineSeriesStyle: {
                          point: {
                            visible: false,
                          },
                        },
                      }}
                    />
                    <LineSeries
                      id="action_delay"
                      xScaleType="time"
                      yScaleType="linear"
                      xAccessor={0}
                      yAccessors={[1]}
                      data={ruleMonitoringSummary.actions
                        .reverse()
                        .map((action) => [action.start, action.delay])}
                      fit={Fit.Linear}
                      curve={CurveType.CURVE_NATURAL}
                    />
                    <LineSeries
                      id="action_delay_avg"
                      xScaleType="time"
                      yScaleType="linear"
                      xAccessor={0}
                      yAccessors={[1]}
                      data={ruleMonitoringSummary.actions
                        .reverse()
                        .map((action) => [
                          action.start,
                          ruleMonitoringSummary.avg_action_delay ?? 0,
                        ])}
                      curve={CurveType.CURVE_NATURAL}
                    />
                    <Axis
                      title={formatDate(Date.now(), dateFormatAliases.date)}
                      id="bottom-axis"
                      position="bottom"
                      tickFormat={timeFormatter(niceTimeFormatByDay(1))}
                    />
                    <Axis
                      id="left-axis"
                      position="left"
                      showGridLines
                      tickFormat={(d) => formatNanoseconds(d)}
                    />
                  </Chart>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGrid>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items={pageOfActions}
              pagination={{
                pageIndex: actionPagination.index,
                pageSize: actionPagination.size,
                totalItemCount: ruleMonitoringSummary.actions.length,
              }}
              onChange={({ page: changedPage }: { page: Pagination }) => {
                setActionPagination(changedPage);
              }}
              rowProps={() => ({
                'data-test-subj': 'action-row',
              })}
              cellProps={() => ({
                'data-test-subj': 'cell',
              })}
              columns={[
                {
                  field: 'start',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleActionExecutionList.columns.start',
                    { defaultMessage: 'Execution start' }
                  ),
                  sortable: false,
                  truncateText: true,
                  'data-test-subj': 'ruleActionExecutionsTableCell-start',
                  render: (value: string) => {
                    return <span>{value}</span>;
                  },
                },
                {
                  field: 'duration',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleActionExecutionList.columns.duration',
                    { defaultMessage: 'Duration' }
                  ),
                  render: (value: string) => {
                    return value ? formatNanoseconds(value) : '0ms';
                  },
                  sortable: false,
                  'data-test-subj': 'ruleActionExecutionsTableCell-duration',
                },
                {
                  field: 'delay',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleActionExecutionList.columns.delay',
                    { defaultMessage: 'Delay' }
                  ),
                  render: (value: string) => {
                    return value ? formatNanoseconds(value) : '0ms';
                  },
                  sortable: false,
                  'data-test-subj': 'ruleActionExecutionsTableCell-delay',
                },
                {
                  field: 'outcome',
                  name: i18n.translate(
                    'xpack.triggersActionsUI.sections.ruleMonitoring.ruleActionExecutionList.columns.outcome',
                    { defaultMessage: 'Outcome' }
                  ),
                  render: (value: string, item: RuleExecutionSummary) => {
                    return value === 'failure' ? (
                      <EuiToolTip content={item.error_message}>
                        <span>{value}</span>
                      </EuiToolTip>
                    ) : (
                      <span>{value}</span>
                    );
                  },
                  sortable: false,
                  'data-test-subj': 'ruleActionExecutionsTableCell-outcome',
                },
              ]}
              data-test-subj="ruleActionExecutionList"
              tableLayout="fixed"
              className="ruleActionExecutionList"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
}

function getPage(items: any[], pagination: Pagination) {
  return chunk(items, pagination.size)[pagination.index] || [];
}
