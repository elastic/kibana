/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { estypes } from '@elastic/elasticsearch';
import { ALERTS_FEATURE_ID, RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useGetRuleTypeDefinitionFromRuleType } from '../../hooks/use_get_rule_type_definition_from_rule_type';
import { DeleteConfirmationModal } from './components/delete_modal_confirmation';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { PageTitle } from './components/page_title';
import { NoRuleFoundPanel } from './components/no_rule_found_panel';
import { RuleDetailTabs } from './components/rule_detail_tabs';
import { HeaderActions } from './components/header_actions';
import { getHealthColor } from './helpers/get_health_color';
import { canEditRule } from './helpers/can_edit_rule';
import {
  defaultTimeRange,
  getDefaultAlertSummaryTimeRange,
} from '../../utils/alert_summary_widget';
import { toQuery } from '../../utils/url';
import { paths } from '../../config/paths';
import { ALERT_STATUS_ALL } from '../../../common/constants';
import { ruleDetailsLocatorID } from '../../../common';
import type { AlertStatus } from '../../../common/typings';

export const EXECUTION_TAB = 'execution';
export const ALERTS_TAB = 'alerts';
export const SEARCH_BAR_URL_STORAGE_KEY = 'searchBarParams';
export const EVENT_ERROR_LOG_TAB = 'rule_error_log_list';
export const RULE_DETAILS_PAGE_ID = 'rule-details-alerts-o11y';
export const RULE_DETAILS_ALERTS_SEARCH_BAR_ID = 'rule-details-alerts-search-bar-o11y';

export type TabId = typeof ALERTS_TAB | typeof EXECUTION_TAB;

export interface RuleDetailsPathParams {
  ruleId: string;
}

export function RuleDetailsPage() {
  const {
    application: { capabilities, navigateToUrl },
    charts,
    http,
    notifications: { toasts },
    share: {
      url: { locators },
    },
    triggersActionsUi: {
      actionTypeRegistry,
      ruleTypeRegistry,
      getAlertSummaryWidget: AlertSummaryWidget,
      getEditRuleFlyout: EditRuleFlyout,
      getRuleDefinition: RuleDefinition,
      getRuleStatusPanel: RuleStatusPanel,
    },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();

  const { ruleId } = useParams<RuleDetailsPathParams>();

  const { isRuleLoading, rule, errorRule, reloadRule } = useFetchRule({ ruleId, http });

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend(paths.observability.alerts),
    },
    {
      href: http.basePath.prepend(paths.observability.rules),
      text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
        defaultMessage: 'Rules',
      }),
    },
    {
      text: rule && rule.name,
    },
  ]);

  const ruleTypeDefinition = useGetRuleTypeDefinitionFromRuleType({ ruleTypeId: rule?.ruleTypeId });

  const chartProps = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const urlTabId = (toQuery(location.search)?.tabId as TabId) || EXECUTION_TAB;
    return [EXECUTION_TAB, ALERTS_TAB].includes(urlTabId) ? urlTabId : EXECUTION_TAB;
  });

  const [editRuleFlyoutVisible, setEditRuleFlyoutVisible] = useState<boolean>(false);

  const [ruleToDelete, setRuleToDelete] = useState<string | undefined>(undefined);
  const [isRuleDeleting, setIsRuleDeleting] = useState(false);

  const [alertSummaryWidgetTimeRange, setAlertSummaryWidgetTimeRange] = useState(
    getDefaultAlertSummaryTimeRange
  );

  const alertSummaryWidgetFilter = useRef<estypes.QueryDslQueryContainer>({
    term: {
      'kibana.alert.rule.uuid': ruleId,
    },
  });

  const tabsRef = useRef<HTMLDivElement>(null);

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

    setActiveTab(ALERTS_TAB);

    tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChangeTab = (newTab: TabId) => {
    setActiveTab(newTab);
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
    navigateToUrl(http.basePath.prepend(paths.observability.rules));
  };

  const handleChangeEsQuery = () => {
    setAlertSummaryWidgetTimeRange(getDefaultAlertSummaryTimeRange());
  };

  const featureIds = (
    !rule || !ruleTypeDefinition
      ? undefined
      : rule.consumer === ALERTS_FEATURE_ID && ruleTypeDefinition.producer
      ? [ruleTypeDefinition.producer]
      : [rule.consumer]
  ) as AlertConsumers[];

  const isRuleEditable = canEditRule({ rule, ruleTypeDefinition, capabilities, ruleTypeRegistry });

  if (errorRule) {
    toasts.addDanger({ title: errorRule });
  }

  if (isRuleLoading || isRuleDeleting) return <CenterJustifiedSpinner />;

  if (!rule || errorRule) return <NoRuleFoundPanel />;

  return (
    <ObservabilityPageTemplate
      data-test-subj="ruleDetails"
      pageHeader={{
        pageTitle: <PageTitle rule={rule} />,
        bottomBorder: false,
        rightSideItems: isRuleEditable
          ? [
              <HeaderActions
                loading={isRuleLoading || isRuleDeleting}
                onEditRule={handleEditRule}
                onDeleteRule={handleDeleteRule}
              />,
            ]
          : undefined,
      }}
    >
      <EuiFlexGroup wrap gutterSize="m">
        <EuiFlexItem style={{ minWidth: 350 }}>
          <RuleStatusPanel
            isEditable={isRuleEditable}
            healthColor={getHealthColor(rule.executionStatus.status)}
            requestRefresh={reloadRule}
            rule={rule}
            statusMessage={
              rule?.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License
                ? i18n.translate('xpack.observability.ruleDetails.ruleStatusLicenseError', {
                    defaultMessage: 'License Error',
                  })
                : rule
                ? rulesStatusesTranslationsMapping[rule.executionStatus.status]
                : ''
            }
          />
        </EuiFlexItem>

        <EuiFlexItem style={{ minWidth: 350 }}>
          <AlertSummaryWidget
            chartProps={chartProps}
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
          onEditRule={reloadRule}
        />
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <div ref={tabsRef} />

      {rule && ruleTypeDefinition ? (
        <RuleDetailTabs
          featureIds={featureIds}
          rule={rule}
          ruleId={ruleId}
          ruleType={ruleTypeDefinition}
          activeTab={activeTab}
          onChangeTab={handleChangeTab}
          onChangeEsQuery={handleChangeEsQuery}
        />
      ) : null}

      {editRuleFlyoutVisible ? (
        <EditRuleFlyout initialRule={rule} onClose={handleCloseRuleFlyout} onSave={reloadRule} />
      ) : null}

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

const rulesStatusesTranslationsMapping: Record<string, string> = {
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
};
