/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useHistory, useParams, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
  EuiFlyoutSize,
  EuiTabbedContentTab,
} from '@elastic/eui';

import { useLoadRuleTypes, RuleType } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTS_FEATURE_ID, RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import { Query, BoolQuery } from '@kbn/es-query';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../utils/kibana_react';
import { fromQuery, toQuery } from '../../utils/url';
import {
  defaultTimeRange,
  getDefaultAlertSummaryTimeRange,
} from '../../utils/alert_summary_widget';
import { PageTitle } from './components/page_title';
import { ObservabilityAlertSearchbarWithUrlSync } from '../../components/alert_search_bar/alert_search_bar_with_url_sync';
import { DeleteConfirmationModal } from './components/delete_confirmation_modal';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { NoRuleFoundPanel } from './components/no_rule_found_panel';
import { HeaderActions } from './components/header_actions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { getHealthColor } from './helpers/get_health_color';
import { hasAllPrivilege } from './helpers/has_all_privilege';
import { paths } from '../../config/paths';
import { ALERT_STATUS_ALL } from '../../../common/constants';
import { observabilityFeatureId, ruleDetailsLocatorID } from '../../../common';
import {
  EXECUTION_TAB,
  ALERTS_TAB,
  RULE_DETAILS_PAGE_ID,
  RULE_DETAILS_ALERTS_SEARCH_BAR_ID,
  SEARCH_BAR_URL_STORAGE_KEY,
} from './constants';
import type { AlertStatus } from '../../../common/typings';

export type TabId = typeof ALERTS_TAB | typeof EXECUTION_TAB;

interface RuleDetailsPathParams {
  ruleId: string;
}
export function RuleDetailsPage() {
  const {
    application: { capabilities, navigateToUrl },
    charts: {
      theme: { useChartsBaseTheme, useChartsTheme },
    },
    http: { basePath },
    share: {
      url: { locators },
    },
    triggersActionsUi: {
      actionTypeRegistry,
      alertsTableConfigurationRegistry,
      ruleTypeRegistry,
      getAlertsStateTable: AlertsStateTable,
      getAlertSummaryWidget: AlertSummaryWidget,
      getEditRuleFlyout: EditRuleFlyout,
      getRuleDefinition: RuleDefinition,
      getRuleEventLogList: RuleEventLogList,
      getRuleStatusPanel: RuleStatusPanel,
    },
  } = useKibana().services;
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const history = useHistory();
  const location = useLocation();

  const theme = useChartsTheme();
  const baseTheme = useChartsBaseTheme();

  const { rule, isLoading, isError, refetch } = useFetchRule({ ruleId });

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: basePath.prepend(paths.observability.alerts),
    },
    {
      href: basePath.prepend(paths.observability.rules),
      text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
        defaultMessage: 'Rules',
      }),
    },
    {
      text: rule && rule.name,
    },
  ]);

  const filteredRuleTypes = useMemo(
    () => observabilityRuleTypeRegistry.list(),
    [observabilityRuleTypeRegistry]
  );

  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });

  const [isEditRuleFlyoutVisible, setEditRuleFlyoutVisible] = useState<boolean>(false);

  const [tabId, setTabId] = useState<TabId>(() => {
    const urlTabId = (toQuery(location.search)?.tabId as TabId) || EXECUTION_TAB;
    return [EXECUTION_TAB, ALERTS_TAB].includes(urlTabId) ? urlTabId : EXECUTION_TAB;
  });
  const [featureIds, setFeatureIds] = useState<ValidFeatureId[]>();
  const [ruleType, setRuleType] = useState<RuleType<string, string>>();

  const [ruleToDelete, setRuleToDelete] = useState<string | undefined>(undefined);
  const [isRuleDeleting, setIsRuleDeleting] = useState(false);

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

  useEffect(() => {
    setAlertSummaryWidgetTimeRange(getDefaultAlertSummaryTimeRange());
  }, [esQuery]);

  const onAlertSummaryWidgetClick = async (status: AlertStatus = ALERT_STATUS_ALL) => {
    setAlertSummaryWidgetTimeRange(getDefaultAlertSummaryTimeRange());
    await locators.get(ruleDetailsLocatorID)?.navigate(
      {
        rangeFrom: defaultTimeRange.from,
        rangeTo: defaultTimeRange.to,
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

  const handleEditRule = () => {
    setEditRuleFlyoutVisible(true);
  };

  const handleCloseRuleFlyout = () => {
    setEditRuleFlyoutVisible(false);
  };

  const handleDeleteRule = () => {
    setRuleToDelete(rule?.id);
    setEditRuleFlyoutVisible(false);
  };

  const handleIsDeletingRule = () => {
    setIsRuleDeleting(true);
  };

  const handleIsRuleDeleted = () => {
    setRuleToDelete(undefined);
    setIsRuleDeleting(false);
    navigateToUrl(basePath.prepend(paths.observability.rules));
  };

  useEffect(() => {
    if (ruleTypes.length && rule) {
      const matchedRuleType = ruleTypes.find((type) => type.id === rule.ruleTypeId);
      setRuleType(matchedRuleType);

      if (rule.consumer === ALERTS_FEATURE_ID && matchedRuleType && matchedRuleType.producer) {
        setFeatureIds([matchedRuleType.producer] as ValidFeatureId[]);
      } else setFeatureIds([rule.consumer] as ValidFeatureId[]);
    }
  }, [rule, ruleTypes]);

  const canExecuteActions = capabilities?.actions?.execute;

  const canSaveRule =
    rule &&
    hasAllPrivilege(rule, ruleType) &&
    // if the rule has actions, can the user save the rule's action params
    (canExecuteActions || (!canExecuteActions && rule.actions.length === 0));

  const isRuleEditable = Boolean(
    // can the user save the rule
    canSaveRule &&
      // is this rule type editable from within Rules Management
      (ruleTypeRegistry.has(rule.ruleTypeId)
        ? !ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext
        : false)
  );

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
            {rule && ruleType ? <RuleEventLogList ruleId={rule.id} ruleType={ruleType} /> : null}
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
                  showAlertStatusWithFlapping
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
  ];

  if (isLoading || isRuleDeleting) return <CenterJustifiedSpinner />;

  if (!rule || isError) return <NoRuleFoundPanel />;

  const statusMessage =
    rule.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License
      ? rulesStatusesTranslationsMapping.noLicense
      : rulesStatusesTranslationsMapping[rule.executionStatus.status];

  return (
    <ObservabilityPageTemplate
      data-test-subj="ruleDetails"
      pageHeader={{
        pageTitle: <PageTitle rule={rule} />,
        bottomBorder: false,
        rightSideItems: [
          <HeaderActions
            isLoading={isLoading || isRuleDeleting}
            isRuleEditable={isRuleEditable}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
          />,
        ],
      }}
    >
      <EuiFlexGroup wrap gutterSize="m">
        <EuiFlexItem style={{ minWidth: 350 }}>
          <RuleStatusPanel
            rule={rule}
            isEditable={isRuleEditable}
            requestRefresh={refetch}
            healthColor={getHealthColor(rule.executionStatus.status)}
            statusMessage={statusMessage}
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 350 }}>
          <AlertSummaryWidget
            chartProps={{ theme, baseTheme }}
            featureIds={featureIds}
            onClick={onAlertSummaryWidgetClick}
            timeRange={alertSummaryWidgetTimeRange}
            filter={alertSummaryWidgetFilter.current}
          />
        </EuiFlexItem>

        <RuleDefinition
          actionTypeRegistry={actionTypeRegistry}
          rule={rule}
          ruleTypeRegistry={ruleTypeRegistry}
          onEditRule={async () => {
            refetch();
          }}
        />
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

      {isEditRuleFlyoutVisible && (
        <EditRuleFlyout
          initialRule={rule}
          onClose={handleCloseRuleFlyout}
          onSave={async () => {
            refetch();
          }}
        />
      )}

      {ruleToDelete ? (
        <DeleteConfirmationModal
          ruleIdToDelete={ruleToDelete}
          title={rule.name}
          onCancel={() => setRuleToDelete(undefined)}
          onDeleting={handleIsDeletingRule}
          onDeleted={handleIsRuleDeleted}
        />
      ) : null}
    </ObservabilityPageTemplate>
  );
}

const rulesStatusesTranslationsMapping = {
  ok: i18n.translate('xpack.observability.ruleDetails.ruleStatusOk', {
    defaultMessage: 'Ok',
  }),
  active: i18n.translate('xpack.observability.ruleDetails.ruleStatusActive', {
    defaultMessage: 'Active',
  }),
  error: i18n.translate('xpack.observability.ruleDetails.ruleStatusError', {
    defaultMessage: 'Error',
  }),
  pending: i18n.translate('xpack.observability.ruleDetails.ruleStatusPending', {
    defaultMessage: 'Pending',
  }),
  unknown: i18n.translate('xpack.observability.ruleDetails.ruleStatusUnknown', {
    defaultMessage: 'Unknown',
  }),
  warning: i18n.translate('xpack.observability.ruleDetails.ruleStatusWarning', {
    defaultMessage: 'Warning',
  }),
  noLicense: i18n.translate('xpack.observability.ruleDetails.ruleStatusLicenseError', {
    defaultMessage: 'License Error',
  }),
};
