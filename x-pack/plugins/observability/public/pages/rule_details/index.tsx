/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  EuiEmptyPrompt,
  EuiLoadingSpinner,
} from '@elastic/eui';

import {
  enableRule,
  disableRule,
  snoozeRule,
  unsnoozeRule,
  deleteRules,
  useLoadRuleTypes,
  RuleType,
  NOTIFY_WHEN_OPTIONS,
  RuleEventLogListProps,
} from '@kbn/triggers-actions-ui-plugin/public';
// TODO: use a Delete modal from triggersActionUI when it's sharable
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';

import { DeleteModalConfirmation } from '../rules/components/delete_modal_confirmation';
import { CenterJustifiedSpinner } from '../rules/components/center_justified_spinner';
import { getHealthColor, OBSERVABILITY_SOLUTIONS } from '../rules/config';
import {
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
import { useFetchLast24hAlerts } from '../../hooks/use_fetch_last24h_alerts';
import { formatInterval } from './utils';
import { hasExecuteActionsCapability, hasAllPrivilege } from './config';
import { paths } from '../../config/paths';

export function RuleDetailsPage() {
  const {
    http,
    triggersActionsUi: {
      ruleTypeRegistry,
      getRuleStatusDropdown,
      getEditAlertFlyout,
      getRuleEventLogList,
    },
    application: { capabilities, navigateToUrl },
    notifications: { toasts },
  } = useKibana().services;

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { isRuleLoading, rule, errorRule, reloadRule } = useFetchRule({ ruleId, http });
  const { ruleTypes, ruleTypeIndex } = useLoadRuleTypes({
    filteredSolutions: OBSERVABILITY_SOLUTIONS,
  });

  const [features, setFeatures] = useState<string>('');
  const [ruleType, setRuleType] = useState<RuleType<string, string>>();
  const [ruleToDelete, setRuleToDelete] = useState<string[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const { last24hAlerts } = useFetchLast24hAlerts({
    http,
    features,
    ruleId,
  });

  const [editFlyoutVisible, setEditFlyoutVisible] = useState<boolean>(false);
  const [isRuleEditPopoverOpen, setIsRuleEditPopoverOpen] = useState(false);

  const handleClosePopover = useCallback(() => setIsRuleEditPopoverOpen(false), []);

  const handleOpenPopover = useCallback(() => setIsRuleEditPopoverOpen(true), []);

  const handleRemoveRule = useCallback(() => {
    setIsRuleEditPopoverOpen(false);
    if (rule) setRuleToDelete([rule.id]);
  }, [rule]);

  const handleEditRule = useCallback(() => {
    setIsRuleEditPopoverOpen(false);
    setEditFlyoutVisible(true);
  }, []);

  useEffect(() => {
    if (ruleTypes.length && rule) {
      const matchedRuleType = ruleTypes.find((type) => type.id === rule.ruleTypeId);
      setRuleType(matchedRuleType);

      if (rule.consumer === ALERTS_FEATURE_ID && matchedRuleType && matchedRuleType.producer) {
        setFeatures(matchedRuleType.producer);
      } else setFeatures(rule.consumer);
    }
  }, [rule, ruleTypes]);

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend(paths.observability.alerts),
    },
    {
      href: http.basePath.prepend(paths.observability.rules),
      text: RULES_BREADCRUMB_TEXT,
    },
    {
      text: rule && rule.name,
    },
  ]);

  const canExecuteActions = hasExecuteActionsCapability(capabilities);
  const canSaveRule =
    rule &&
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

  const getRuleConditionsWording = () => {
    const numberOfConditions = rule?.params.criteria ? (rule?.params.criteria as any[]).length : 0;
    return (
      <>
        {numberOfConditions}&nbsp;
        {i18n.translate('xpack.observability.ruleDetails.conditions', {
          defaultMessage: 'condition{s}',
          values: { s: numberOfConditions > 1 ? 's' : '' },
        })}
      </>
    );
  };

  const tabs = [
    {
      id: EVENT_LOG_LIST_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.eventLogTabText', {
        defaultMessage: 'Execution history',
      }),
      'data-test-subj': 'eventLogListTab',
      content: rule ? (
        getRuleEventLogList({
          rule,
        } as RuleEventLogListProps)
      ) : (
        <EuiLoadingSpinner size="m" />
      ),
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

  if (isPageLoading || isRuleLoading) return <CenterJustifiedSpinner />;
  if (!rule || errorRule)
    return (
      <EuiPanel>
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          title={
            <h2>
              {i18n.translate('xpack.observability.ruleDetails.errorPromptTitle', {
                defaultMessage: 'Unable to load rule details',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.observability.ruleDetails.errorPromptBody', {
                defaultMessage: 'There was an error loading the rule details.',
              })}
            </p>
          }
        />
      </EuiPanel>
    );
  const getNotifyText = () =>
    NOTIFY_WHEN_OPTIONS.find((option) => option.value === rule?.notifyWhen)?.inputDisplay ||
    rule.notifyWhen;
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
                    closePopover={handleClosePopover}
                    button={
                      <EuiButtonIcon
                        display="base"
                        size="m"
                        iconType="boxesHorizontal"
                        aria-label="More"
                        onClick={handleOpenPopover}
                      />
                    }
                  >
                    <EuiFlexGroup direction="column" alignItems="flexStart">
                      <EuiButtonEmpty size="s" iconType="pencil" onClick={handleEditRule}>
                        <EuiSpacer size="s" />
                        <EuiText size="s">
                          {i18n.translate('xpack.observability.ruleDetails.editRule', {
                            defaultMessage: 'Edit rule',
                          })}
                        </EuiText>
                      </EuiButtonEmpty>
                      <EuiSpacer size="s" />
                      <EuiButtonEmpty
                        size="s"
                        iconType="trash"
                        color="danger"
                        onClick={handleRemoveRule}
                      >
                        <EuiText size="s">
                          {i18n.translate('xpack.observability.ruleDetails.deleteRule', {
                            defaultMessage: 'Delete rule',
                          })}
                        </EuiText>
                      </EuiButtonEmpty>
                      <EuiSpacer size="s" />
                    </EuiFlexGroup>
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

                  {getRuleStatusDropdown({
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
          <EuiPanel
            color={getHealthColor(rule.executionStatus.status)}
            hasBorder={false}
            paddingSize={'l'}
          >
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <EuiHealth textSize="inherit" color={getHealthColor(rule.executionStatus.status)}>
                    {rule.executionStatus.status.charAt(0).toUpperCase() +
                      rule.executionStatus.status.slice(1)}
                  </EuiHealth>
                </EuiTitle>
              </EuiFlexItem>
              <EuiSpacer size="l" />
              <EuiFlexGroup>
                <ItemTitleRuleSummary>
                  {i18n.translate('xpack.observability.ruleDetails.lastRun', {
                    defaultMessage: 'Last Run',
                  })}
                </ItemTitleRuleSummary>
                <ItemValueRuleSummary
                  extraSpace={false}
                  itemValue={moment(rule.executionStatus.lastExecutionDate).fromNow()}
                />
              </EuiFlexGroup>
              <EuiSpacer size="xl" />

              <EuiHorizontalRule margin="none" />
              <EuiSpacer size="s" />

              <EuiFlexGroup>
                <ItemTitleRuleSummary>
                  {i18n.translate('xpack.observability.ruleDetails.alerts', {
                    defaultMessage: 'Alerts',
                  })}
                </ItemTitleRuleSummary>

                <ItemValueRuleSummary
                  extraSpace={false}
                  itemValue={`
                    ${String(last24hAlerts)} ${i18n.translate(
                    'xpack.observability.ruleDetails.last24h',
                    {
                      defaultMessage: '(last 24 h)',
                    }
                  )}`}
                />
              </EuiFlexGroup>
              <EuiSpacer size="l" />
              <EuiSpacer size="l" />
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        {/* Right side of Rule Summary */}

        <EuiFlexItem grow={3}>
          <EuiPanel color="subdued" hasBorder={false} paddingSize={'l'}>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiTitle size="s">
                <EuiFlexItem grow={false}>
                  {i18n.translate('xpack.observability.ruleDetails.definition', {
                    defaultMessage: 'Definition',
                  })}
                </EuiFlexItem>
              </EuiTitle>
              {hasEditButton && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty iconType={'pencil'} onClick={() => setEditFlyoutVisible(true)} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            <EuiSpacer size="l" />

            <EuiFlexGroup alignItems="baseline">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <ItemTitleRuleSummary>
                    {i18n.translate('xpack.observability.ruleDetails.ruleType', {
                      defaultMessage: 'Rule type',
                    })}
                  </ItemTitleRuleSummary>
                  <ItemValueRuleSummary
                    itemValue={ruleTypeIndex.get(rule.ruleTypeId)?.name || rule.ruleTypeId}
                  />
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup alignItems="flexStart">
                  <ItemTitleRuleSummary>
                    {i18n.translate('xpack.observability.ruleDetails.description', {
                      defaultMessage: 'Description',
                    })}
                  </ItemTitleRuleSummary>
                  <ItemValueRuleSummary
                    itemValue={ruleTypeRegistry.get(rule.ruleTypeId).description}
                  />
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup>
                  <ItemTitleRuleSummary>
                    {i18n.translate('xpack.observability.ruleDetails.conditionsTitle', {
                      defaultMessage: 'Conditions',
                    })}
                  </ItemTitleRuleSummary>
                  <EuiFlexItem grow={3}>
                    <EuiFlexGroup alignItems="center">
                      {hasEditButton ? (
                        <EuiButtonEmpty onClick={() => setEditFlyoutVisible(true)}>
                          <EuiText size="s">{getRuleConditionsWording()}</EuiText>
                        </EuiButtonEmpty>
                      ) : (
                        <EuiText size="s">{getRuleConditionsWording()}</EuiText>
                      )}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <ItemTitleRuleSummary>
                    {i18n.translate('xpack.observability.ruleDetails.runsEvery', {
                      defaultMessage: 'Runs every',
                    })}
                  </ItemTitleRuleSummary>

                  <ItemValueRuleSummary itemValue={formatInterval(rule.schedule.interval)} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />

                <EuiFlexGroup>
                  <ItemTitleRuleSummary>
                    {i18n.translate('xpack.observability.ruleDetails.notifyWhen', {
                      defaultMessage: 'Notify',
                    })}
                  </ItemTitleRuleSummary>
                  <ItemValueRuleSummary itemValue={String(getNotifyText())} />
                </EuiFlexGroup>

                <EuiSpacer size="l" />
                <EuiFlexGroup alignItems="baseline">
                  <ItemTitleRuleSummary>
                    {i18n.translate('xpack.observability.ruleDetails.actions', {
                      defaultMessage: 'Actions',
                    })}
                  </ItemTitleRuleSummary>
                  <EuiFlexItem grow={3}>
                    <Actions ruleActions={rule.actions} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />
      <EuiTabbedContent data-test-subj="ruleDetailsTabbedContent" tabs={tabs} />
      {editFlyoutVisible &&
        getEditAlertFlyout({
          initialRule: rule,
          onClose: () => {
            setEditFlyoutVisible(false);
          },
          onSave: reloadRule,
        })}
      <DeleteModalConfirmation
        onDeleted={async () => {
          setRuleToDelete([]);
          navigateToUrl(http.basePath.prepend(paths.observability.rules));
        }}
        onErrors={async () => {
          setRuleToDelete([]);
          navigateToUrl(http.basePath.prepend(paths.observability.rules));
        }}
        onCancel={() => {}}
        apiDeleteCall={deleteRules}
        idsToDelete={ruleToDelete}
        singleTitle={rule.name}
        multipleTitle={rule.name}
        setIsLoadingState={(isLoading: boolean) => {
          setIsPageLoading(isLoading);
        }}
      />
      {errorRule && toasts.addDanger({ title: errorRule })}
    </ObservabilityPageTemplate>
  );
}
