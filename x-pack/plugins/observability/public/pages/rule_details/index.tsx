/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPanel,
  EuiTitle,
  EuiHealth,
  EuiPopover,
  EuiHorizontalRule,
  EuiTabbedContent,
} from '@elastic/eui';
import { ActionGroup } from '@kbn/alerting-plugin/common';
import { AlertStatusValues } from '@kbn/alerting-plugin/common';
import { AlertStatus } from '@kbn/triggers-actions-ui-plugin/public';
import {
  enableRule,
  disableRule,
  snoozeRule,
  unsnoozeRule,
} from '@kbn/triggers-actions-ui-plugin/public';
import { RuleType } from '@kbn/triggers-actions-ui-plugin/public';
import {
  AlertListItem,
  RuleDetailsPathParams,
  EVENT_ERROR_LOG_TAB,
  EVENT_LOG_LIST_TAB,
  ALERT_LIST_TAB,
} from './types';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { RULES_BREADCRUMB_TEXT } from '../rules/translations';
import { PageTitle, ItemTitleRuleSummary, ItemValueRuleSummary, Actions } from './components';
import { useKibana } from '../../utils/kibana_react';
import { useFetchRuleSummary } from '../../hooks/use_fetch_rule_summary';
import { getColorStatusBased } from './utils';
import { hasExecuteActionsCapability, hasAllPrivilege } from './config';

export function RuleDetailsPage() {
  const {
    http,
    triggersActionsUi: { ruleTypeRegistry },
    application: { capabilities },
    notifications: { toasts },
    triggersActionsUi,
  } = useKibana().services;

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { isLoadingRule, rule, ruleType, errorRule, reloadRule } = useFetchRule({ ruleId, http });
  const { isLoadingRuleSummary, ruleSummary, errorRuleSummary, reloadRuleSummary } =
    useFetchRuleSummary({ ruleId, http });
  const [editFlyoutVisible, setEditFlyoutVisible] = useState<boolean>(false);
  const [isRuleEditPopoverOpen, setIsRuleEditPopoverOpen] = useState(false);

  const [alerts, setAlerts] = useState<AlertListItem[]>([]);

  useEffect(() => {
    if (!errorRuleSummary && ruleSummary?.alerts) {
      const durationEpoch = Date.now();
      const sortedAlerts = Object.entries(ruleSummary.alerts)
        .map(([alertId, alert]) => alertToListItem(durationEpoch, alertId, alert))
        .sort((leftAlert, rightAlert) => leftAlert.sortPriority - rightAlert.sortPriority);
      setAlerts(sortedAlerts);
    }
  }, [ruleSummary, errorRuleSummary, http, rule]);

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend('/app/observability/alerts/'),
    },
    {
      href: http.basePath.prepend('/app/observability/alerts/rules'),
      text: RULES_BREADCRUMB_TEXT,
    },
    {
      text: rule && rule.name,
    },
  ]);
  const tabs = [
    {
      id: EVENT_LOG_LIST_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.eventLogTabText', {
        defaultMessage: 'Execution history',
      }),
      'data-test-subj': 'eventLogListTab',
      content: <EuiText>Execution history</EuiText>,
    },
    {
      id: ALERT_LIST_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.alertsTabText', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'ruleAlertListTab',
      content: <EuiText>Alerts</EuiText>,
    },
    {
      id: EVENT_ERROR_LOG_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.errorLogTabText', {
        defaultMessage: 'Error log',
      }),
      'data-test-subj': 'errorLogTab',
      content: <EuiText>Error log</EuiText>,
    },
  ];

  if (!rule || errorRule) {
    return <EuiFlexItem>Error | No data</EuiFlexItem>;
  }

  const EditAlertFlyout = () =>
    useMemo(
      () =>
        triggersActionsUi.getEditAlertFlyout({
          initialRule: rule,
          onClose: () => {
            setEditFlyoutVisible(false);
          },
          onSave: reloadRule,
        }),
      []
    );

  const canExecuteActions = hasExecuteActionsCapability(capabilities);
  const canSaveRule =
    hasAllPrivilege(rule, ruleType) &&
    // if the rule has actions, can the user save the rule's action params
    (canExecuteActions || (!canExecuteActions && rule.actions.length === 0));

  const hasEditButton =
    // can the user save the rule
    canSaveRule &&
    // is this rule type editable from within Rules Management
    (ruleTypeRegistry.has(rule.ruleTypeId)
      ? !ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext
      : false);

  const {
    executionStatus: { status, lastExecutionDate },
    ruleTypeId,
    params,
    schedule: { interval },
    notifyWhen,
    actions,
  } = rule;

  const { description } = ruleTypeRegistry.get(rule?.ruleTypeId);

  console.log('rule', rule);
  console.log('ruleSummary', ruleSummary);

  const getRuleConditionsWording = () => (
    <>
      {params.criteria ? String((params.criteria as any[]).length) : 0}{' '}
      {/* TODO:  Add [s] to the conditions word based on how many conditions */}
      {i18n.translate('xpack.observability.ruleDetails.conditions', {
        defaultMessage: 'conditions',
      })}
    </>
  );

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <PageTitle rule={rule} />,
        bottomBorder: false,
        rightSideItems: hasEditButton
          ? [
              <EuiFlexGroup direction="rowReverse" alignItems="center">
                <EuiFlexItem>
                  <EuiPopover
                    id="contextRuleEditMenu"
                    isOpen={isRuleEditPopoverOpen}
                    closePopover={() => setIsRuleEditPopoverOpen(false)}
                    button={
                      <EuiButtonIcon
                        display="base"
                        size="m"
                        iconType="boxesHorizontal"
                        aria-label="More"
                        onClick={() => setIsRuleEditPopoverOpen(true)}
                      />
                    }
                  >
                    <EuiButtonEmpty
                      size="m"
                      iconType="pencil"
                      onClick={() => {
                        setIsRuleEditPopoverOpen(false);
                        setEditFlyoutVisible(true);
                      }}
                    >
                      <EuiText size="m">
                        {i18n.translate('xpack.observability.ruleDetails.editRule', {
                          defaultMessage: 'Edit rule',
                        })}
                      </EuiText>
                    </EuiButtonEmpty>
                  </EuiPopover>
                </EuiFlexItem>
                <EuiSpacer size="s" />
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <EuiFlexItem>
                      {i18n.translate('xpack.observability.ruleDetails.triggreAction.status', {
                        defaultMessage: 'Status',
                      })}
                    </EuiFlexItem>
                  </EuiTitle>

                  {triggersActionsUi.getRuleStatusDropdown({
                    rule,
                    enableRule: async () => await enableRule({ http, id: rule.id }),
                    disableRule: async () => await disableRule({ http, id: rule.id }),
                    onRuleChanged: () => reloadRule(),
                    isEditable: hasEditButton,
                    snoozeRule: async (snoozeEndTime: string | -1) => {
                      await snoozeRule({ http, id: rule.id, snoozeEndTime });
                    },
                    unsnoozeRule: async () => await unsnoozeRule({ http, id: rule.id }),
                  })}
                </EuiFlexItem>
              </EuiFlexGroup>,
            ]
          : [],
      }}
    >
      <EuiFlexGroup wrap={true}>
        {/* Left side of Rule Summary */}
        <EuiFlexItem grow={1}>
          <EuiPanel color={getColorStatusBased(status)} hasBorder={false} paddingSize={'l'}>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle size="m">
                  <EuiHealth textSize="inherit" color={getColorStatusBased(status)}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </EuiHealth>
                </EuiTitle>
              </EuiFlexItem>
              <EuiSpacer size="l" />
              <EuiFlexGroup>
                <ItemTitleRuleSummary
                  translationKey="xpack.observability.ruleDetails.lastRun"
                  defaultMessage="Last Run"
                />
                <ItemValueRuleSummary
                  extraSpace={false}
                  itemValue={moment(lastExecutionDate).fromNow()}
                />
              </EuiFlexGroup>
              <EuiSpacer size="xl" />

              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="s" />

              <EuiFlexGroup>
                <ItemTitleRuleSummary
                  translationKey="xpack.observability.ruleDetails.last24hAlerts"
                  defaultMessage="Alerts (last 24 h)"
                />
                {/* TODO: Get all the Alerts not only the Active ones */}
                <ItemValueRuleSummary extraSpace={false} itemValue={String(alerts.length)} />
              </EuiFlexGroup>
              <EuiSpacer size="l" />
              <EuiSpacer size="l" />
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        {/* Right side of Rule Summary */}

        <EuiFlexItem grow={3}>
          <EuiPanel color="subdued" hasBorder={false} paddingSize={'l'}>
            <EuiTitle>
              <EuiFlexItem>
                {i18n.translate('xpack.observability.ruleDetails.definition', {
                  defaultMessage: 'Definition',
                })}
              </EuiFlexItem>
            </EuiTitle>

            <EuiSpacer size="l" />

            <EuiFlexGroup alignItems="baseline">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.ruleType"
                    defaultMessage="Rule type"
                  />
                  <ItemValueRuleSummary itemValue={ruleTypeId} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup alignItems="flexStart">
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.description"
                    defaultMessage="Description"
                  />
                  <ItemValueRuleSummary itemValue={description} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup justifyContent="flexStart">
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.conditions"
                    defaultMessage="Conditions"
                  />
                  <EuiFlexItem grow={3}>
                    <EuiText size="m">
                      {hasEditButton ? (
                        <EuiButtonEmpty onClick={() => setEditFlyoutVisible(true)}>
                          {getRuleConditionsWording()}
                        </EuiButtonEmpty>
                      ) : (
                        <EuiText>{getRuleConditionsWording()}</EuiText>
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.runsEvery"
                    defaultMessage="Runs every"
                  />

                  {/* TODO:  format interval*/}
                  <ItemValueRuleSummary itemValue={interval} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup>
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.notifyWhen"
                    defaultMessage="Notify"
                  />

                  <ItemValueRuleSummary itemValue={String(notifyWhen)} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />
                <EuiFlexGroup alignItems="baseline">
                  <ItemTitleRuleSummary
                    translationKey="xpack.observability.ruleDetails.actions"
                    defaultMessage="Actions"
                  />
                  <EuiFlexItem grow={3}>
                    <Actions actions={actions} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {editFlyoutVisible && <EditAlertFlyout />}
      {errorRule &&
        toasts.addDanger({
          title: errorRule,
        })}
      <EuiSpacer size="l" />
      <EuiTabbedContent data-test-subj="ruleDetailsTabbedContent" tabs={tabs} />
    </ObservabilityPageTemplate>
  );
}

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
  // ruleType: RuleType,
  alertId: string,
  alert: AlertStatus
): AlertListItem {
  const isMuted = !!alert?.muted;
  const status =
    alert?.status === 'Active'
      ? {
          label: ACTIVE_LABEL,
          // actionGroup: getActionGroupName(ruleType, alert?.actionGroupId),
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
