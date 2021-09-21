/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import moment, { Duration } from 'moment';
import {
  dateFormatAliases,
  EuiBasicTable,
  EuiFlexGrid,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiTitle,
  EuiToolTip,
  formatDate,
} from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT, CENTER_ALIGNMENT } from '@elastic/eui/lib/services';
import { chunk, padStart } from 'lodash';
import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatByDay,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { RuleExecutionSummary } from '../../../../../../alerting/common';
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

  return (
    <>
      <EuiFlexGrid gutterSize="l" columns={4}>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <EuiStat
              title={formatNanoseconds(ruleMonitoringSummary.avg_duration.toString())}
              description="Average execution duration"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <EuiStat
              title={formatNanoseconds(ruleMonitoringSummary.avg_delay.toString())}
              description="Average execution delay"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <EuiStat
              title={formatNanoseconds(ruleMonitoringSummary.avg_action_duration.toString())}
              description="Average action duration"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <EuiStat
              title={formatNanoseconds(ruleMonitoringSummary.avg_action_delay.toString())}
              description="Average action delay"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="xl" />
      <EuiFlexGrid gutterSize="l" columns={2}>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <EuiTitle size="s">
              <h3>Execution Duration and Delay</h3>
            </EuiTitle>
            <EuiHorizontalRule />
            <EuiSpacer size="s" />
            <EuiFlexGrid gutterSize="s" columns={2}>
              <EuiFlexItem>
                <EuiStat
                  title={formatNanoseconds(ruleMonitoringSummary.avg_duration.toString())}
                  description="Average execution duration"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  title={formatNanoseconds(ruleMonitoringSummary.avg_delay.toString())}
                  description="Average execution delay"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  title={formatNanoseconds(ruleMonitoringSummary.avg_action_duration.toString())}
                  description="Average action duration"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  title={formatNanoseconds(ruleMonitoringSummary.avg_action_delay.toString())}
                  description="Average action delay"
                />
              </EuiFlexItem>
            </EuiFlexGrid>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
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
                data={ruleMonitoringSummary.executions
                  .filter((execution) => execution.outcome === 'success')
                  .map((execution) => [execution.start, execution.duration])}
                xScaleType="time"
                xAccessor={0}
                yAccessors={[1]}
              />
              <BarSeries
                id="rule_failure"
                name="Rule executions (failed)"
                data={ruleMonitoringSummary.executions
                  .filter((execution) => execution.outcome === 'failure')
                  .map((execution) => [execution.start, execution.duration])}
                xScaleType="time"
                xAccessor={0}
                yAccessors={[1]}
              />
              <BarSeries
                id="action_success"
                name="Action executions (success)"
                data={ruleMonitoringSummary.actions
                  .filter((action) => action.outcome === 'success')
                  .map((action) => [action.start, action.duration])}
                xScaleType="time"
                xAccessor={0}
                yAccessors={[1]}
              />
              <BarSeries
                id="action_failure"
                name="Action executions (failed)"
                data={ruleMonitoringSummary.actions
                  .filter((action) => action.outcome === 'failure')
                  .map((action) => [action.start, action.duration])}
                xScaleType="time"
                xAccessor={0}
                yAccessors={[1]}
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
                    title={formatNanoseconds(ruleMonitoringSummary.avg_duration.toString())}
                    description="Average execution duration"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder={true}>
                  <EuiStat
                    title={formatNanoseconds(ruleMonitoringSummary.avg_delay.toString())}
                    description="Average execution delay"
                  />
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
                    title={formatNanoseconds(ruleMonitoringSummary.avg_action_duration.toString())}
                    description="Average action duration"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasBorder={true}>
                  <EuiStat
                    title={formatNanoseconds(ruleMonitoringSummary.avg_action_delay.toString())}
                    description="Average action delay"
                  />
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
