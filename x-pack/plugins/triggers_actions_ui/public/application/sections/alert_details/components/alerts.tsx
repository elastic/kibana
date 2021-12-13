/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import moment, { Duration } from 'moment';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiHealth,
  EuiSpacer,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiStat,
  EuiIconTip,
} from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT, CENTER_ALIGNMENT } from '@elastic/eui/lib/services';
import { padStart, chunk } from 'lodash';
import {
  ActionGroup,
  AlertExecutionStatusErrorReasons,
  AlertStatusValues,
} from '../../../../../../alerting/common';
import { Rule, AlertSummary, AlertStatus, RuleType, Pagination } from '../../../../types';
import {
  ComponentOpts as AlertApis,
  withBulkAlertOperations,
} from '../../common/components/with_bulk_alert_api_operations';
import { DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';
import './alerts.scss';
import { RuleMutedSwitch } from './rule_muted_switch';
import { getHealthColor } from '../../alerts_list/components/alert_status_filter';
import {
  alertsStatusesTranslationsMapping,
  ALERT_STATUS_LICENSE_ERROR,
} from '../../alerts_list/translations';
import {
  formatMillisForDisplay,
  shouldShowDurationWarning,
} from '../../../lib/execution_duration_utils';
import { ExecutionDurationChart } from '../../common/components/execution_duration_chart';

type AlertsProps = {
  rule: Rule;
  ruleType: RuleType;
  readOnly: boolean;
  alertSummary: AlertSummary;
  requestRefresh: () => Promise<void>;
  durationEpoch?: number;
} & Pick<AlertApis, 'muteAlertInstance' | 'unmuteAlertInstance'>;

export const alertsTableColumns = (
  onMuteAction: (alert: AlertListItem) => Promise<void>,
  readOnly: boolean
) => [
  {
    field: 'alert',
    name: i18n.translate('xpack.triggersActionsUI.sections.alertDetails.alertsList.columns.alert', {
      defaultMessage: 'Alert',
    }),
    sortable: false,
    truncateText: true,
    width: '45%',
    'data-test-subj': 'alertsTableCell-alert',
    render: (value: string) => {
      return (
        <EuiToolTip anchorClassName={'eui-textTruncate'} content={value}>
          <span>{value}</span>
        </EuiToolTip>
      );
    },
  },
  {
    field: 'status',
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertsList.columns.status',
      { defaultMessage: 'Status' }
    ),
    width: '15%',
    render: (value: AlertListItemStatus) => {
      return (
        <EuiHealth color={value.healthColor} className="alertsList__health">
          {value.label}
          {value.actionGroup ? ` (${value.actionGroup})` : ``}
        </EuiHealth>
      );
    },
    sortable: false,
    'data-test-subj': 'alertsTableCell-status',
  },
  {
    field: 'start',
    width: '190px',
    render: (value: Date | undefined) => {
      return value ? moment(value).format('D MMM YYYY @ HH:mm:ss') : '';
    },
    name: i18n.translate('xpack.triggersActionsUI.sections.alertDetails.alertsList.columns.start', {
      defaultMessage: 'Start',
    }),
    sortable: false,
    'data-test-subj': 'alertsTableCell-start',
  },
  {
    field: 'duration',
    render: (value: number) => {
      return value ? durationAsString(moment.duration(value)) : '';
    },
    name: i18n.translate(
      'xpack.triggersActionsUI.sections.alertDetails.alertsList.columns.duration',
      { defaultMessage: 'Duration' }
    ),
    sortable: false,
    width: '80px',
    'data-test-subj': 'alertsTableCell-duration',
  },
  {
    field: '',
    align: RIGHT_ALIGNMENT,
    width: '60px',
    name: i18n.translate('xpack.triggersActionsUI.sections.alertDetails.alertsList.columns.mute', {
      defaultMessage: 'Mute',
    }),
    render: (alert: AlertListItem) => {
      return (
        <RuleMutedSwitch
          disabled={readOnly}
          onMuteAction={async () => await onMuteAction(alert)}
          alert={alert}
        />
      );
    },
    sortable: false,
    'data-test-subj': 'alertsTableCell-actions',
  },
];

function durationAsString(duration: Duration): string {
  return [duration.hours(), duration.minutes(), duration.seconds()]
    .map((value) => padStart(`${value}`, 2, '0'))
    .join(':');
}

export function Alerts({
  rule,
  ruleType,
  readOnly,
  alertSummary,
  muteAlertInstance,
  unmuteAlertInstance,
  requestRefresh,
  durationEpoch = Date.now(),
}: AlertsProps) {
  const [pagination, setPagination] = useState<Pagination>({
    index: 0,
    size: DEFAULT_SEARCH_PAGE_SIZE,
  });

  const alerts = Object.entries(alertSummary.alerts)
    .map(([alertId, alert]) => alertToListItem(durationEpoch, ruleType, alertId, alert))
    .sort((leftAlert, rightAlert) => leftAlert.sortPriority - rightAlert.sortPriority);

  const pageOfAlerts = getPage(alerts, pagination);

  const onMuteAction = async (alert: AlertListItem) => {
    await (alert.isMuted
      ? unmuteAlertInstance(rule, alert.alert)
      : muteAlertInstance(rule, alert.alert));
    requestRefresh();
  };

  const showDurationWarning = shouldShowDurationWarning(
    ruleType,
    alertSummary.executionDuration.average
  );

  const healthColor = getHealthColor(rule.executionStatus.status);
  const isLicenseError =
    rule.executionStatus.error?.reason === AlertExecutionStatusErrorReasons.License;
  const statusMessage = isLicenseError
    ? ALERT_STATUS_LICENSE_ERROR
    : alertsStatusesTranslationsMapping[rule.executionStatus.status];

  return (
    <>
      <EuiHorizontalRule />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiPanel color="subdued" hasBorder={false}>
            <EuiStat
              data-test-subj={`ruleStatus-${rule.executionStatus.status}`}
              titleSize="xs"
              title={
                <EuiHealth
                  data-test-subj={`ruleStatus-${rule.executionStatus.status}`}
                  textSize="inherit"
                  color={healthColor}
                >
                  {statusMessage}
                </EuiHealth>
              }
              description={i18n.translate(
                'xpack.triggersActionsUI.sections.alertDetails.alertsList.ruleLastExecutionDescription',
                {
                  defaultMessage: `Last response`,
                }
              )}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel
            data-test-subj="avgExecutionDurationPanel"
            color={showDurationWarning ? 'warning' : 'subdued'}
            hasBorder={false}
          >
            <EuiStat
              data-test-subj="avgExecutionDurationStat"
              titleSize="xs"
              title={
                <EuiFlexGroup gutterSize="xs">
                  {showDurationWarning && (
                    <EuiFlexItem grow={false}>
                      <EuiIconTip
                        data-test-subj="ruleDurationWarning"
                        anchorClassName="ruleDurationWarningIcon"
                        type="alert"
                        color="warning"
                        content={i18n.translate(
                          'xpack.triggersActionsUI.sections.alertDetails.alertsList.ruleTypeExcessDurationMessage',
                          {
                            defaultMessage: `Duration exceeds the rule's expected run time.`,
                          }
                        )}
                        position="top"
                      />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    {formatMillisForDisplay(alertSummary.executionDuration.average)}
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              description={i18n.translate(
                'xpack.triggersActionsUI.sections.alertDetails.alertsList.avgDurationDescription',
                {
                  defaultMessage: `Average duration`,
                }
              )}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <ExecutionDurationChart executionDuration={alertSummary.executionDuration} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      <input
        type="hidden"
        data-test-subj="alertsDurationEpoch"
        name="alertsDurationEpoch"
        value={durationEpoch}
      />
      <EuiBasicTable
        items={pageOfAlerts}
        pagination={{
          pageIndex: pagination.index,
          pageSize: pagination.size,
          totalItemCount: alerts.length,
        }}
        onChange={({ page: changedPage }: { page: Pagination }) => {
          setPagination(changedPage);
        }}
        rowProps={() => ({
          'data-test-subj': 'alert-row',
        })}
        cellProps={() => ({
          'data-test-subj': 'cell',
        })}
        columns={alertsTableColumns(onMuteAction, readOnly)}
        data-test-subj="alertsList"
        tableLayout="fixed"
        className="alertsList"
      />
    </>
  );
}
export const AlertsWithApi = withBulkAlertOperations(Alerts);

function getPage(items: any[], pagination: Pagination) {
  return chunk(items, pagination.size)[pagination.index] || [];
}

interface AlertListItemStatus {
  label: string;
  healthColor: string;
  actionGroup?: string;
}
export interface AlertListItem {
  alert: string;
  status: AlertListItemStatus;
  start?: Date;
  duration: number;
  isMuted: boolean;
  sortPriority: number;
}

const ACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertDetails.alertsList.status.active',
  { defaultMessage: 'Active' }
);

const INACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertDetails.alertsList.status.inactive',
  { defaultMessage: 'Recovered' }
);

function getActionGroupName(ruleType: RuleType, actionGroupId?: string): string | undefined {
  actionGroupId = actionGroupId || ruleType.defaultActionGroupId;
  const actionGroup = ruleType?.actionGroups?.find(
    (group: ActionGroup<string>) => group.id === actionGroupId
  );
  return actionGroup?.name;
}

export function alertToListItem(
  durationEpoch: number,
  ruleType: RuleType,
  alertId: string,
  alert: AlertStatus
): AlertListItem {
  const isMuted = !!alert?.muted;
  const status =
    alert?.status === 'Active'
      ? {
          label: ACTIVE_LABEL,
          actionGroup: getActionGroupName(ruleType, alert?.actionGroupId),
          healthColor: 'primary',
        }
      : { label: INACTIVE_LABEL, healthColor: 'subdued' };
  const start = alert?.activeStartDate ? new Date(alert.activeStartDate) : undefined;
  const duration = start ? durationEpoch - start.valueOf() : 0;
  const sortPriority = getSortPriorityByStatus(alert?.status);
  return {
    alert: alertId,
    status,
    start,
    duration,
    isMuted,
    sortPriority,
  };
}

function getSortPriorityByStatus(status?: AlertStatusValues): number {
  switch (status) {
    case 'Active':
      return 0;
    case 'OK':
      return 1;
  }
  return 2;
}
