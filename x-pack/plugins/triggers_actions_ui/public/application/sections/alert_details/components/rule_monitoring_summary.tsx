/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import moment, { Duration } from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiHealth, EuiSpacer, EuiToolTip } from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT, CENTER_ALIGNMENT } from '@elastic/eui/lib/services';
import { padStart, chunk } from 'lodash';
import {
  ActionGroup,
  AlertInstanceStatusValues,
  RuleExecutionSummary,
} from '../../../../../../alerting/common';
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
  ruleMonitoringSumnmary: RuleMonitoringSummaryInterface;
  durationEpoch?: number;
}

function durationAsString(duration: Duration): string {
  return [duration.hours(), duration.minutes(), duration.seconds()]
    .map((value) => padStart(`${value}`, 2, '0'))
    .join(':');
}

export function RuleMonitoringSummary({
  rule,
  ruleType,
  ruleMonitoringSummary,
  durationEpoch = Date.now(),
}: RuleMonitoringSummaryProps) {
  const [pagination, setPagination] = useState<Pagination>({
    index: 0,
    size: DEFAULT_SEARCH_PAGE_SIZE,
  });

  const pageOfExecutions = getPage(ruleMonitoringSummary.executions, pagination);

  return (
    <>
      <EuiSpacer size="xl" />
      <input
        type="hidden"
        data-test-subj="alertInstancesDurationEpoch"
        name="alertInstancesDurationEpoch"
        value={durationEpoch}
      />
      <EuiBasicTable
        items={pageOfExecutions}
        pagination={{
          pageIndex: pagination.index,
          pageSize: pagination.size,
          totalItemCount: ruleMonitoringSummary.executions.length,
        }}
        onChange={({ page: changedPage }: { page: Pagination }) => {
          setPagination(changedPage);
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
              return <span>{value}</span>;
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
              return <span>{value}</span>;
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
        data-test-subj="alertInstancesList"
        tableLayout="fixed"
        className="alertInstancesList"
      />
    </>
  );
}

function getPage(items: any[], pagination: Pagination) {
  return chunk(items, pagination.size)[pagination.index] || [];
}
