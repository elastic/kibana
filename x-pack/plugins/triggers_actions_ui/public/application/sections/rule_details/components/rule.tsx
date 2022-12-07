/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiTabbedContent } from '@elastic/eui';
import { ActionGroup, AlertStatusValues } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import { Rule, RuleSummary, AlertStatus, RuleType } from '../../../../types';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import './rule.scss';
import type { RuleEventLogListProps } from './rule_event_log_list';
import { AlertListItem } from './types';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { suspendedComponentWithProps } from '../../../lib/suspended_component_with_props';
import {
  getRuleHealthColor,
  getRuleStatusMessage,
} from '../../../../common/lib/rule_status_helpers';
import RuleStatusPanelWithApi from './rule_status_panel';
import {
  ALERT_STATUS_LICENSE_ERROR,
  rulesLastRunOutcomeTranslationMapping,
  rulesStatusesTranslationsMapping,
} from '../../rules_list/translations';

const RuleEventLogList = lazy(() => import('./rule_event_log_list'));
const RuleAlertList = lazy(() => import('./rule_alert_list'));
const RuleDefinition = lazy(() => import('./rule_definition'));

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
  const { ruleTypeRegistry, actionTypeRegistry } = useKibana().services;

  const alerts = Object.entries(ruleSummary.alerts)
    .map(([alertId, alert]) => alertToListItem(durationEpoch, ruleType, alertId, alert))
    .sort((leftAlert, rightAlert) => leftAlert.sortPriority - rightAlert.sortPriority);

  const onMuteAction = async (alert: AlertListItem) => {
    await (alert.isMuted
      ? unmuteAlertInstance(rule, alert.alert)
      : muteAlertInstance(rule, alert.alert));
    requestRefresh();
  };

  const healthColor = getRuleHealthColor(rule);
  const statusMessage = getRuleStatusMessage({
    rule,
    licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
    lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
    executionStatusTranslations: rulesStatusesTranslationsMapping,
  });

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
      id: ALERT_LIST_TAB,
      name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.rule.alertsTabText', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'ruleAlertListTab',
      content: (
        <>
          <EuiSpacer />
          {renderRuleAlertList()}
        </>
      ),
    },
    {
      id: EVENT_LOG_LIST_TAB,
      name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.rule.eventLogTabText', {
        defaultMessage: 'History',
      }),
      'data-test-subj': 'eventLogListTab',
      content: suspendedComponentWithProps<RuleEventLogListProps<'stackManagement'>>(
        RuleEventLogList,
        'xl'
      )({
        fetchRuleSummary: false,
        ruleId: rule.id,
        ruleType,
        ruleSummary,
        numberOfExecutions,
        refreshToken,
        isLoadingRuleSummary: isLoadingChart,
        onChangeDuration,
        requestRefresh,
      }),
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
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={2}>
          <RuleStatusPanelWithApi
            rule={rule}
            isEditable={!readOnly}
            healthColor={healthColor}
            statusMessage={statusMessage}
            requestRefresh={requestRefresh}
          />
        </EuiFlexItem>
        {suspendedComponentWithProps(
          RuleDefinition,
          'xl'
        )({
          rule,
          actionTypeRegistry,
          ruleTypeRegistry,
          hideEditButton: true,
          onEditRule: requestRefresh,
        })}
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
