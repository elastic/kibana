/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiHealth,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiStat,
  EuiIconTip,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT, CENTER_ALIGNMENT } from '@elastic/eui/lib/services';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import {
  ActionGroup,
  AlertExecutionStatusErrorReasons,
  AlertStatusValues,
} from '../../../../../../alerting/common';
import { Rule, RuleSummary, AlertStatus, RuleType } from '../../../../types';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import './rule.scss';
import { getHealthColor } from '../../rules_list/components/rule_status_filter';
import {
  rulesStatusesTranslationsMapping,
  ALERT_STATUS_LICENSE_ERROR,
} from '../../rules_list/translations';
import {
  formatMillisForDisplay,
  shouldShowDurationWarning,
} from '../../../lib/execution_duration_utils';
import { ExecutionDurationChart } from '../../common/components/execution_duration_chart';
// import { RuleEventLogListWithApi } from './rule_event_log_list';
import { AlertListItem } from './types';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { suspendedComponentWithProps } from '../../../lib/suspended_component_with_props';

const RuleEventLogListWithApi = lazy(() => import('./rule_event_log_list'));
const RuleErrorLogWithApi = lazy(() => import('./rule_error_log'));

const RuleAlertList = lazy(() => import('./rule_alert_list'));

type RuleProps = {
  rule: Rule;
  ruleType: RuleType;
  readOnly: boolean;
  ruleSummary: RuleSummary;
  requestRefresh: () => Promise<void>;
  refreshToken?: number;
  numberOfExecutions: number;
  onChangeDuration: (length: number) => void;
  durationEpoch?: number;
  isLoadingChart?: boolean;
} & Pick<RuleApis, 'muteAlertInstance' | 'unmuteAlertInstance'>;

const EVENT_LOG_LIST_TAB = 'rule_event_log_list';
const ALERT_LIST_TAB = 'rule_alert_list';
const EVENT_ERROR_LOG_TAB = 'rule_error_log_list';

export function RuleComponent({
  rule,
  ruleType,
  readOnly,
  ruleSummary,
  muteAlertInstance,
  unmuteAlertInstance,
  requestRefresh,
  refreshToken,
  numberOfExecutions,
  onChangeDuration,
  durationEpoch = Date.now(),
  isLoadingChart,
}: RuleProps) {
  const alerts = Object.entries(ruleSummary.alerts)
    .map(([alertId, alert]) => alertToListItem(durationEpoch, ruleType, alertId, alert))
    .sort((leftAlert, rightAlert) => leftAlert.sortPriority - rightAlert.sortPriority);

  const onMuteAction = async (alert: AlertListItem) => {
    await (alert.isMuted
      ? unmuteAlertInstance(rule, alert.alert)
      : muteAlertInstance(rule, alert.alert));
    requestRefresh();
  };

  const showDurationWarning = shouldShowDurationWarning(
    ruleType,
    ruleSummary.executionDuration.average
  );

  const healthColor = getHealthColor(rule.executionStatus.status);
  const isLicenseError =
    rule.executionStatus.error?.reason === AlertExecutionStatusErrorReasons.License;
  const statusMessage = isLicenseError
    ? ALERT_STATUS_LICENSE_ERROR
    : rulesStatusesTranslationsMapping[rule.executionStatus.status];

  const renderRuleAlertList = () => {
    return suspendedComponentWithProps(
      RuleAlertList,
      'xl'
    )({
      items: alerts,
      readOnly,
      onMuteAction,
    });
  };

  const tabs = [
    {
      id: EVENT_LOG_LIST_TAB,
      name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.rule.eventLogTabText', {
        defaultMessage: 'Execution history',
      }),
      'data-test-subj': 'eventLogListTab',
      content: suspendedComponentWithProps(
        RuleEventLogListWithApi,
        'xl'
      )({ requestRefresh, rule, refreshToken }),
    },
    {
      id: ALERT_LIST_TAB,
      name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.rule.alertsTabText', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'ruleAlertListTab',
      content: renderRuleAlertList(),
    },
    {
      id: EVENT_ERROR_LOG_TAB,
      name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.rule.errorLogTabText', {
        defaultMessage: 'Error log',
      }),
      'data-test-subj': 'errorLogTab',
      content: suspendedComponentWithProps(
        RuleErrorLogWithApi,
        'xl'
      )({ requestRefresh, rule, refreshToken }),
    },
  ];

  const renderTabs = () => {
    const isEnabled = getIsExperimentalFeatureEnabled('rulesDetailLogs');
    if (isEnabled) {
      return <EuiTabbedContent data-test-subj="ruleDetailsTabbedContent" tabs={tabs} />;
    }
    return renderRuleAlertList();
  };

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiPanel color="subdued" hasBorder={false}>
            <EuiFlexGroup
              gutterSize="none"
              direction="column"
              justifyContent="spaceBetween"
              responsive={false}
              style={{ height: '100%' }}
            >
              <EuiFlexItem>
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
                    'xpack.triggersActionsUI.sections.ruleDetails.rulesList.ruleLastExecutionDescription',
                    {
                      defaultMessage: `Last response`,
                    }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <p>
                  <EuiText size="xs">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.ruleLastExecutionUpdatedAt"
                      defaultMessage="Updated"
                    />
                  </EuiText>
                  <EuiText color="subdued" size="xs">
                    {moment(rule.executionStatus.lastExecutionDate).fromNow()}
                  </EuiText>
                </p>
              </EuiFlexItem>
            </EuiFlexGroup>
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
                          'xpack.triggersActionsUI.sections.ruleDetails.alertsList.ruleTypeExcessDurationMessage',
                          {
                            defaultMessage: `Duration exceeds the rule's expected run time.`,
                          }
                        )}
                        position="top"
                      />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    {formatMillisForDisplay(ruleSummary.executionDuration.average)}
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              description={i18n.translate(
                'xpack.triggersActionsUI.sections.ruleDetails.alertsList.avgDurationDescription',
                {
                  defaultMessage: `Average duration`,
                }
              )}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <ExecutionDurationChart
            executionDuration={ruleSummary.executionDuration}
            numberOfExecutions={numberOfExecutions}
            onChangeDuration={onChangeDuration}
            isLoading={isLoadingChart}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xl" />
      <input
        type="hidden"
        data-test-subj="alertsDurationEpoch"
        name="alertsDurationEpoch"
        value={durationEpoch}
      />
      {renderTabs()}
    </>
  );
}
export const RuleWithApi = withBulkRuleOperations(RuleComponent);

const ACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.rulesList.status.active',
  { defaultMessage: 'Active' }
);

const INACTIVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.rulesList.status.inactive',
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
