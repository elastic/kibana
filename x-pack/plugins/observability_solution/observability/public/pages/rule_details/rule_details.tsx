/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERTING_FEATURE_ID, RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import type { BoolQuery } from '@kbn/es-query';
import type { AlertConsumers } from '@kbn/rule-data-utils';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useFetchRuleTypes } from '../../hooks/use_fetch_rule_types';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { PageTitleContent } from './components/page_title_content';
import { DeleteConfirmationModal } from './components/delete_confirmation_modal';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { NoRuleFoundPanel } from './components/no_rule_found_panel';
import { HeaderActions } from './components/header_actions';
import { RuleDetailsTabs } from './components/rule_details_tabs';
import { getHealthColor } from './helpers/get_health_color';
import { isRuleEditable } from './helpers/is_rule_editable';
import { ruleDetailsLocatorID } from '../../../common';
import { ALERT_STATUS_ALL } from '../../../common/constants';
import {
  RULE_DETAILS_EXECUTION_TAB,
  RULE_DETAILS_ALERTS_TAB,
  RULE_DETAILS_TAB_URL_STORAGE_KEY,
} from './constants';
import { paths } from '../../../common/locators/paths';
import {
  defaultTimeRange,
  getDefaultAlertSummaryTimeRange,
} from '../../utils/alert_summary_widget';
import type { AlertStatus } from '../../../common/typings';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';

export type TabId = typeof RULE_DETAILS_ALERTS_TAB | typeof RULE_DETAILS_EXECUTION_TAB;

interface RuleDetailsPathParams {
  ruleId: string;
}
export function RuleDetailsPage() {
  const {
    application: { capabilities, navigateToUrl },
    http: { basePath },
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
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { search } = useLocation();
  const { rule, isLoading, isError, refetch } = useFetchRule({ ruleId });
  const filteredRuleTypes = useGetFilteredRuleTypes();
  const { ruleTypes } = useFetchRuleTypes({
    filterByRuleTypeIds: filteredRuleTypes,
  });

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
          defaultMessage: 'Alerts',
        }),
        href: basePath.prepend(paths.observability.alerts),
        deepLinkId: 'observability-overview:alerts',
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
    ],
    { serverless }
  );

  const [activeTabId, setActiveTabId] = useState<TabId>(() => {
    const searchParams = new URLSearchParams(search);
    const urlTabId = searchParams.get(RULE_DETAILS_TAB_URL_STORAGE_KEY);

    return urlTabId && [RULE_DETAILS_EXECUTION_TAB, RULE_DETAILS_ALERTS_TAB].includes(urlTabId)
      ? (urlTabId as TabId)
      : RULE_DETAILS_ALERTS_TAB;
  });

  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();

  const [alertSummaryWidgetTimeRange, setAlertSummaryWidgetTimeRange] = useState(
    getDefaultAlertSummaryTimeRange
  );

  const [isEditRuleFlyoutVisible, setEditRuleFlyoutVisible] = useState<boolean>(false);

  const [ruleToDelete, setRuleToDelete] = useState<string | undefined>(undefined);
  const [isRuleDeleting, setIsRuleDeleting] = useState(false);

  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAlertSummaryWidgetTimeRange(getDefaultAlertSummaryTimeRange());
  }, [esQuery]);

  const handleSetTabId = async (tabId: TabId) => {
    setActiveTabId(tabId);

    await locators.get(ruleDetailsLocatorID)?.navigate(
      {
        ruleId,
        tabId,
      },
      {
        replace: true,
      }
    );
  };

  const handleAlertSummaryWidgetClick = async (status: AlertStatus = ALERT_STATUS_ALL) => {
    setAlertSummaryWidgetTimeRange(getDefaultAlertSummaryTimeRange());

    await locators.get(ruleDetailsLocatorID)?.navigate(
      {
        rangeFrom: defaultTimeRange.from,
        rangeTo: defaultTimeRange.to,
        ruleId,
        status,
        tabId: RULE_DETAILS_ALERTS_TAB,
      },
      {
        replace: true,
      }
    );

    setActiveTabId(RULE_DETAILS_ALERTS_TAB);

    tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const ruleType = ruleTypes?.find((type) => type.id === rule?.ruleTypeId);

  const isEditable = isRuleEditable({ capabilities, rule, ruleType, ruleTypeRegistry });

  const featureIds =
    rule?.consumer === ALERTING_FEATURE_ID && ruleType?.producer
      ? [ruleType.producer as AlertConsumers]
      : rule
      ? [rule.consumer as AlertConsumers]
      : [];

  const ruleStatusMessage =
    rule?.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License
      ? rulesStatusesTranslationsMapping.noLicense
      : rule
      ? rulesStatusesTranslationsMapping[rule.executionStatus.status]
      : '';

  if (isLoading || isRuleDeleting) return <CenterJustifiedSpinner />;
  if (!rule || isError) return <NoRuleFoundPanel />;

  return (
    <ObservabilityPageTemplate
      data-test-subj="ruleDetails"
      pageHeader={{
        pageTitle: rule.name,
        pageTitleProps: {
          'data-test-subj': 'ruleName',
        },
        children: <PageTitleContent rule={rule} />,
        bottomBorder: false,
        rightSideItems: [
          <HeaderActions
            isLoading={isLoading || isRuleDeleting}
            isRuleEditable={isEditable}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
          />,
        ],
      }}
    >
      <HeaderMenu />
      <EuiFlexGroup wrap gutterSize="m">
        <EuiFlexItem style={{ minWidth: 350 }}>
          <RuleStatusPanel
            rule={rule}
            isEditable={isEditable}
            requestRefresh={refetch}
            healthColor={getHealthColor(rule.executionStatus.status)}
            statusMessage={ruleStatusMessage}
          />
        </EuiFlexItem>

        <EuiFlexItem style={{ minWidth: 350 }}>
          <AlertSummaryWidget
            featureIds={featureIds}
            onClick={handleAlertSummaryWidgetClick}
            timeRange={alertSummaryWidgetTimeRange}
            filter={{
              term: {
                'kibana.alert.rule.uuid': ruleId,
              },
            }}
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

      <RuleDetailsTabs
        esQuery={esQuery}
        featureIds={featureIds}
        rule={rule}
        ruleId={ruleId}
        ruleType={ruleType}
        activeTabId={activeTabId}
        onEsQueryChange={setEsQuery}
        onSetTabId={handleSetTabId}
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
