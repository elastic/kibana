/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiTabbedContent } from '@elastic/eui';
import { AlertStatusValues, ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { ALERT_RULE_UUID, AlertConsumers } from '@kbn/rule-data-utils';
import { ALERT_TABLE_GENERIC_CONFIG_ID } from '../../../constants';
import { AlertTableConfigRegistry } from '../../../alert_table_config_registry';
import { useKibana } from '../../../../common/lib/kibana';
import { Rule, RuleSummary, AlertStatus, RuleType } from '../../../../types';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import './rule.scss';
import type { RuleEventLogListProps } from './rule_event_log_list';
import { AlertListItem, RefreshToken } from './types';
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
const AlertsTable = lazy(() => import('../../alerts_table/alerts_table_state'));

export type RuleComponentProps = {
  rule: Rule;
  ruleType: RuleType;
  readOnly: boolean;
  ruleSummary: RuleSummary;
  requestRefresh: () => Promise<void>;
  refreshToken?: RefreshToken;
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
}: RuleComponentProps) {
  const { ruleTypeRegistry, actionTypeRegistry, alertsTableConfigurationRegistry } =
    useKibana().services;

  const alerts = Object.entries(ruleSummary.alerts)
    .map(([alertId, alert]) => alertToListItem(durationEpoch, alertId, alert))
    .sort((leftAlert, rightAlert) => leftAlert.sortPriority - rightAlert.sortPriority);

  const onMuteAction = useCallback(
    async (alert: AlertListItem) => {
      await (alert.isMuted
        ? unmuteAlertInstance(rule, alert.alert)
        : muteAlertInstance(rule, alert.alert));
      requestRefresh();
    },
    [muteAlertInstance, requestRefresh, rule, unmuteAlertInstance]
  );

  const healthColor = getRuleHealthColor(rule);
  const statusMessage = getRuleStatusMessage({
    rule,
    licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
    lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
    executionStatusTranslations: rulesStatusesTranslationsMapping,
  });

  const renderRuleAlertList = useCallback(() => {
    const featureIds = (
      [ALERTS_FEATURE_ID, AlertConsumers.STACK_ALERTS].includes(rule.consumer)
        ? [ruleType.producer]
        : [rule.consumer]
    ) as AlertConsumers[];
    if (ruleType.hasAlertsMappings || ruleType.hasFieldsForAAD) {
      return (
        <AlertsTable
          id="rule-detail-alerts-table"
          configurationId={ALERT_TABLE_GENERIC_CONFIG_ID}
          alertsTableConfigurationRegistry={
            alertsTableConfigurationRegistry as AlertTableConfigRegistry
          }
          featureIds={featureIds}
          query={{ bool: { filter: { term: { [ALERT_RULE_UUID]: rule.id } } } }}
          showAlertStatusWithFlapping
        />
      );
    }
    return suspendedComponentWithProps(
      RuleAlertList,
      'xl'
    )({
      items: alerts,
      readOnly,
      onMuteAction,
    });
  }, [
    alerts,
    alertsTableConfigurationRegistry,
    onMuteAction,
    readOnly,
    rule.consumer,
    rule.id,
    ruleType.hasAlertsMappings,
    ruleType.hasFieldsForAAD,
    ruleType.producer,
  ]);

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
            refreshToken={refreshToken}
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

export function alertToListItem(
  durationEpoch: number,
  alertId: string,
  alert: AlertStatus
): AlertListItem {
  const isMuted = !!alert?.muted;
  const status = alert.status;
  const start = alert?.activeStartDate ? new Date(alert.activeStartDate) : undefined;
  const duration = start ? durationEpoch - start.valueOf() : 0;
  const sortPriority = getSortPriorityByStatus(alert?.status);
  const tracked = !!alert?.tracked;
  return {
    alert: alertId,
    status,
    start,
    duration,
    isMuted,
    sortPriority,
    flapping: alert.flapping,
    tracked,
    ...(alert.maintenanceWindowIds ? { maintenanceWindowIds: alert.maintenanceWindowIds } : {}),
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
