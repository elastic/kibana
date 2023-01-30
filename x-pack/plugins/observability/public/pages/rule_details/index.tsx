/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useHistory, useParams, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiTabbedContent,
  EuiEmptyPrompt,
  EuiSuperSelectOption,
  EuiButton,
  EuiFlyoutSize,
  EuiTabbedContentTab,
} from '@elastic/eui';

import {
  bulkDeleteRules,
  useLoadRuleTypes,
  RuleType,
  getNotifyWhenOptions,
  RuleEventLogListProps,
} from '@kbn/triggers-actions-ui-plugin/public';
// TODO: use a Delete modal from triggersActionUI when it's sharable
import { ALERTS_FEATURE_ID, RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import { Query, BoolQuery } from '@kbn/es-query';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { RuleDefinitionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { fromQuery, toQuery } from '../../utils/url';
import { getDefaultAlertSummaryTimeRange } from '../../utils/alert_summary_widget';
import { ObservabilityAlertSearchbarWithUrlSync } from '../../components/shared/alert_search_bar';
import { DeleteModalConfirmation } from './components/delete_modal_confirmation';
import { CenterJustifiedSpinner } from './components/center_justified_spinner';

import {
  EXECUTION_TAB,
  ALERTS_TAB,
  RULE_DETAILS_PAGE_ID,
  RULE_DETAILS_ALERTS_SEARCH_BAR_ID,
  SEARCH_BAR_URL_STORAGE_KEY,
} from './constants';
import { RuleDetailsPathParams, TabId } from './types';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { RULES_BREADCRUMB_TEXT } from '../rules/translations';
import { PageTitle } from './components';
import { getHealthColor } from './config';
import { hasExecuteActionsCapability, hasAllPrivilege } from './config';
import { paths } from '../../config/paths';
import { ALERT_STATUS_ALL } from '../../../common/constants';
import { AlertStatus } from '../../../common/typings';
import { observabilityFeatureId, ruleDetailsLocatorID } from '../../../common';
import { ALERT_STATUS_LICENSE_ERROR, rulesStatusesTranslationsMapping } from './translations';
import { ObservabilityAppServices } from '../../application/types';

export function RuleDetailsPage() {
  const {
    charts,
    http,
    triggersActionsUi: {
      alertsTableConfigurationRegistry,
      ruleTypeRegistry,
      getEditAlertFlyout,
      getRuleEventLogList,
      getAlertsStateTable: AlertsStateTable,
      getAlertSummaryWidget: AlertSummaryWidget,
      getRuleStatusPanel,
      getRuleDefinition,
    },
    application: { capabilities, navigateToUrl },
    notifications: { toasts },
    share: {
      url: { locators },
    },
  } = useKibana<ObservabilityAppServices>().services;

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();
  const history = useHistory();
  const location = useLocation();

  const chartThemes = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };

  const filteredRuleTypes = useMemo(
    () => observabilityRuleTypeRegistry.list(),
    [observabilityRuleTypeRegistry]
  );

  const { isRuleLoading, rule, errorRule, reloadRule } = useFetchRule({ ruleId, http });
  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });
  const [tabId, setTabId] = useState<TabId>(() => {
    const urlTabId = (toQuery(location.search)?.tabId as TabId) || EXECUTION_TAB;
    return [EXECUTION_TAB, ALERTS_TAB].includes(urlTabId) ? urlTabId : EXECUTION_TAB;
  });
  const [featureIds, setFeatureIds] = useState<ValidFeatureId[]>();
  const [ruleType, setRuleType] = useState<RuleType<string, string>>();
  const [ruleToDelete, setRuleToDelete] = useState<string[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [editFlyoutVisible, setEditFlyoutVisible] = useState<boolean>(false);
  const [isRuleEditPopoverOpen, setIsRuleEditPopoverOpen] = useState(false);
  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();
  const [alertSummaryWidgetTimeRange, setAlertSummaryWidgetTimeRange] = useState(
    getDefaultAlertSummaryTimeRange
  );
  const ruleQuery = useRef<Query[]>([
    { query: `kibana.alert.rule.uuid: ${ruleId}`, language: 'kuery' },
  ]);
  const alertSummaryWidgetFilter = useRef<estypes.QueryDslQueryContainer>({
    term: {
      'kibana.alert.rule.uuid': ruleId,
    },
  });
  const tabsRef = useRef<HTMLDivElement>(null);

  const onAlertSummaryWidgetClick = async (status: AlertStatus = ALERT_STATUS_ALL) => {
    const timeRange = getDefaultAlertSummaryTimeRange();
    setAlertSummaryWidgetTimeRange(timeRange);
    await locators.get(ruleDetailsLocatorID)?.navigate(
      {
        rangeFrom: timeRange.utcFrom,
        rangeTo: timeRange.utcTo,
        ruleId,
        status,
        tabId: ALERTS_TAB,
      },
      {
        replace: true,
      }
    );
    setTabId(ALERTS_TAB);
    tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateUrl = (nextQuery: { tabId: TabId }) => {
    const newTabId = nextQuery.tabId;
    const nextSearch =
      newTabId === ALERTS_TAB
        ? {
            ...toQuery(location.search),
            ...nextQuery,
          }
        : { tabId: EXECUTION_TAB };

    history.replace({
      ...location,
      search: fromQuery(nextSearch),
    });
  };

  const onTabIdChange = (newTabId: TabId) => {
    setTabId(newTabId);
    updateUrl({ tabId: newTabId });
  };

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
        setFeatureIds([matchedRuleType.producer] as ValidFeatureId[]);
      } else setFeatureIds([rule.consumer] as ValidFeatureId[]);
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

  const tabs: EuiTabbedContentTab[] = [
    {
      id: EXECUTION_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.eventLogTabText', {
        defaultMessage: 'Execution history',
      }),
      'data-test-subj': 'eventLogListTab',
      content: (
        <EuiFlexGroup style={{ minHeight: 600 }} direction={'column'}>
          <EuiFlexItem>
            {getRuleEventLogList<'default'>({
              ruleId: rule?.id,
              ruleType,
            } as RuleEventLogListProps)}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      id: ALERTS_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.alertsTabText', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'ruleAlertListTab',
      content: (
        <>
          <EuiSpacer size="m" />
          <ObservabilityAlertSearchbarWithUrlSync
            appName={RULE_DETAILS_ALERTS_SEARCH_BAR_ID}
            onEsQueryChange={setEsQuery}
            urlStorageKey={SEARCH_BAR_URL_STORAGE_KEY}
            defaultSearchQueries={ruleQuery.current}
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup style={{ minHeight: 450 }} direction={'column'}>
            <EuiFlexItem>
              {esQuery && featureIds && (
                <AlertsStateTable
                  alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                  configurationId={observabilityFeatureId}
                  id={RULE_DETAILS_PAGE_ID}
                  flyoutSize={'s' as EuiFlyoutSize}
                  featureIds={featureIds}
                  query={esQuery}
                  showExpandToDetails={false}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
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
              <EuiFlexGroup direction="rowReverse" alignItems="flexStart">
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
                    <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
                      <EuiButtonEmpty
                        data-test-subj="editRuleButton"
                        size="s"
                        iconType="pencil"
                        onClick={handleEditRule}
                      >
                        <EuiText size="s">
                          {i18n.translate('xpack.observability.ruleDetails.editRule', {
                            defaultMessage: 'Edit rule',
                          })}
                        </EuiText>
                      </EuiButtonEmpty>
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
                    </EuiFlexGroup>
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>,
            ]
          : [],
      }}
    >
      <EuiFlexGroup wrap gutterSize="m">
        <EuiFlexItem style={{ minWidth: 350 }}>
          {getRuleStatusPanel({
            rule,
            isEditable: hasEditButton,
            requestRefresh: reloadRule,
            healthColor: getHealthColor(rule.executionStatus.status),
            statusMessage,
          })}
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 350 }}>
          <AlertSummaryWidget
            chartThemes={chartThemes}
            featureIds={featureIds}
            onClick={onAlertSummaryWidgetClick}
            timeRange={alertSummaryWidgetTimeRange}
            filter={alertSummaryWidgetFilter.current}
          />
        </EuiFlexItem>
        {getRuleDefinition({ rule, onEditRule: reloadRule } as RuleDefinitionProps)}
      </EuiFlexGroup>

      <EuiSpacer size="l" />
      <div ref={tabsRef} />
      <EuiTabbedContent
        data-test-subj="ruleDetailsTabbedContent"
        tabs={tabs}
        selectedTab={tabs.find((tab) => tab.id === tabId)}
        onTabClick={(tab) => {
          onTabIdChange(tab.id as TabId);
        }}
      />
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
        apiDeleteCall={bulkDeleteRules}
        idsToDelete={ruleToDelete}
        singleTitle={rule.name}
        multipleTitle={rule.name}
        setIsLoadingState={() => setIsPageLoading(true)}
      />
      {errorRule && toasts.addDanger({ title: errorRule })}
    </ObservabilityPageTemplate>
  );
}
