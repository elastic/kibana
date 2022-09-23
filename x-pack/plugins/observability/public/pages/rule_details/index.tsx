/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutSize,
  EuiPanel,
  EuiPopover,
  EuiTabbedContent,
  EuiEmptyPrompt,
  EuiSuperSelectOption,
  EuiButton,
} from '@elastic/eui';

import {
  deleteRules,
  useLoadRuleTypes,
  RuleType,
  getNotifyWhenOptions,
  RuleEventLogListProps,
} from '@kbn/triggers-actions-ui-plugin/public';
// TODO: use a Delete modal from triggersActionUI when it's sharable
import { ALERTS_FEATURE_ID, RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RuleDefinitionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DeleteModalConfirmation } from './components/delete_modal_confirmation';
import { CenterJustifiedSpinner } from './components/center_justified_spinner';
import {
  RuleDetailsPathParams,
  EVENT_LOG_LIST_TAB,
  ALERT_LIST_TAB,
  RULE_DETAILS_PAGE_ID,
} from './types';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { RULES_BREADCRUMB_TEXT } from '../rules/translations';
import { PageTitle } from './components';
import { getHealthColor } from './config';
import { hasExecuteActionsCapability, hasAllPrivilege } from './config';
import { paths } from '../../config/paths';
import { observabilityFeatureId } from '../../../common';
import { ALERT_STATUS_LICENSE_ERROR, rulesStatusesTranslationsMapping } from './translations';
import { ObservabilityAppServices } from '../../application/types';

export function RuleDetailsPage() {
  const {
    http,
    triggersActionsUi: {
      alertsTableConfigurationRegistry,
      ruleTypeRegistry,
      getEditAlertFlyout,
      getRuleEventLogList,
      getAlertsStateTable,
      getRuleAlertsSummary,
      getRuleStatusPanel,
      getRuleDefinition,
    },
    application: { capabilities, navigateToUrl },
    notifications: { toasts },
  } = useKibana<ObservabilityAppServices>().services;

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();

  const filteredRuleTypes = useMemo(
    () => observabilityRuleTypeRegistry.list(),
    [observabilityRuleTypeRegistry]
  );

  const { isRuleLoading, rule, errorRule, reloadRule } = useFetchRule({ ruleId, http });
  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });
  const [features, setFeatures] = useState<string>('');
  const [ruleType, setRuleType] = useState<RuleType<string, string>>();
  const [ruleToDelete, setRuleToDelete] = useState<string[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [editFlyoutVisible, setEditFlyoutVisible] = useState<boolean>(false);
  const [isRuleEditPopoverOpen, setIsRuleEditPopoverOpen] = useState(false);

  const NOTIFY_WHEN_OPTIONS = useRef<Array<EuiSuperSelectOption<unknown>>>([]);
  useEffect(() => {
    const loadNotifyWhenOption = async () => {
      NOTIFY_WHEN_OPTIONS.current = await getNotifyWhenOptions();
    };
    loadNotifyWhenOption();
  }, []);

  const togglePopover = () =>
    setIsRuleEditPopoverOpen((pervIsRuleEditPopoverOpen) => !pervIsRuleEditPopoverOpen);

  const handleClosePopover = () => setIsRuleEditPopoverOpen(false);

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

  const alertStateProps = {
    alertsTableConfigurationRegistry,
    configurationId: observabilityFeatureId,
    id: RULE_DETAILS_PAGE_ID,
    flyoutSize: 's' as EuiFlyoutSize,
    featureIds: [features] as AlertConsumers[],
    query: {
      bool: {
        filter: [
          {
            term: {
              'kibana.alert.rule.uuid': ruleId,
            },
          },
        ],
      },
    },
    showExpandToDetails: false,
  };

  const tabs = [
    {
      id: EVENT_LOG_LIST_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.eventLogTabText', {
        defaultMessage: 'Execution history',
      }),
      'data-test-subj': 'eventLogListTab',
      content: getRuleEventLogList<'default'>({
        ruleId: rule?.id,
        ruleType,
      } as RuleEventLogListProps),
    },
    {
      id: ALERT_LIST_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.alertsTabText', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'ruleAlertListTab',
      content: (
        <>
          <EuiSpacer size="m" />
          {getAlertsStateTable(alertStateProps)}
        </>
      ),
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

  const isLicenseError =
    rule.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License;

  const statusMessage = isLicenseError
    ? ALERT_STATUS_LICENSE_ERROR
    : rulesStatusesTranslationsMapping[rule.executionStatus.status];

  return (
    <ObservabilityPageTemplate
      data-test-subj="ruleDetails"
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
                      <EuiButton
                        fill
                        iconSide="right"
                        onClick={togglePopover}
                        iconType="arrowDown"
                        data-test-subj="actions"
                      >
                        {i18n.translate('xpack.observability.ruleDetails.actionsButtonLabel', {
                          defaultMessage: 'Actions',
                        })}
                      </EuiButton>
                    }
                  >
                    <EuiFlexGroup direction="column" alignItems="flexStart">
                      <EuiButtonEmpty
                        data-test-subj="editRuleButton"
                        size="s"
                        iconType="pencil"
                        onClick={handleEditRule}
                      >
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
                        data-test-subj="deleteRuleButton"
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
              </EuiFlexGroup>,
            ]
          : [],
      }}
    >
      <EuiFlexGroup wrap={true} gutterSize="m">
        <EuiFlexItem style={{ minWidth: 350 }}>
          {getRuleStatusPanel({
            rule,
            isEditable: hasEditButton,
            requestRefresh: reloadRule,
            healthColor: getHealthColor(rule.executionStatus.status),
            statusMessage,
          })}
        </EuiFlexItem>
        <EuiSpacer size="m" />
        <EuiFlexItem style={{ minWidth: 350 }}>
          {getRuleAlertsSummary({
            rule,
            filteredRuleTypes,
          })}
        </EuiFlexItem>
        <EuiSpacer size="m" />
        {getRuleDefinition({ rule, onEditRule: () => reloadRule() } as RuleDefinitionProps)}
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
        onDeleted={() => {
          setRuleToDelete([]);
          navigateToUrl(http.basePath.prepend(paths.observability.rules));
        }}
        onErrors={() => {
          setRuleToDelete([]);
          navigateToUrl(http.basePath.prepend(paths.observability.rules));
        }}
        onCancel={() => setRuleToDelete([])}
        apiDeleteCall={deleteRules}
        idsToDelete={ruleToDelete}
        singleTitle={rule.name}
        multipleTitle={rule.name}
        setIsLoadingState={() => setIsPageLoading(true)}
      />
      {errorRule && toasts.addDanger({ title: errorRule })}
    </ObservabilityPageTemplate>
  );
}
