/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFlyoutSize } from '@elastic/eui';

import React, { useEffect, useState } from 'react';
import { BoolQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { loadRuleAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { ObservabilityAlertSearchbarWithUrlSync } from '../../../../components/shared/alert_search_bar';
import { observabilityAlertFeatureIds } from '../../../../config';
import { useGetUserCasesPermissions } from '../../../../hooks/use_get_user_cases_permissions';
import { observabilityFeatureId } from '../../../../../common';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { useHasData } from '../../../../hooks/use_has_data';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { getNoDataConfig } from '../../../../utils/no_data_config';
import { LoadingObservability } from '../../../overview';
import './styles.scss';
import { renderRuleStats } from '../../components/rule_stats';
import { ObservabilityAppServices } from '../../../../application/types';
import {
  ALERTS_PER_PAGE,
  ALERTS_SEARCH_BAR_ID,
  ALERTS_TABLE_ID,
  URL_STORAGE_KEY,
} from './constants';
import { RuleStatsState } from './types';

export function AlertsPage() {
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();
  const {
    cases,
    docLinks,
    http,
    notifications: { toasts },
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
  } = useKibana<ObservabilityAppServices>().services;

  const [ruleStatsLoading, setRuleStatsLoading] = useState<boolean>(false);
  const [ruleStats, setRuleStats] = useState<RuleStatsState>({
    total: 0,
    disabled: 0,
    muted: 0,
    error: 0,
    snoozed: 0,
  });
  const { hasAnyData, isAllRequestsComplete } = useHasData();
  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
    },
  ]);

  async function loadRuleStats() {
    setRuleStatsLoading(true);
    try {
      const response = await loadRuleAggregations({
        http,
        typesFilter: observabilityRuleTypeRegistry.list(),
      });
      const { ruleExecutionStatus, ruleMutedStatus, ruleEnabledStatus, ruleSnoozedStatus } =
        response;
      if (ruleExecutionStatus && ruleMutedStatus && ruleEnabledStatus && ruleSnoozedStatus) {
        const total = Object.values(ruleExecutionStatus).reduce((acc, value) => acc + value, 0);
        const { disabled } = ruleEnabledStatus;
        const { muted } = ruleMutedStatus;
        const { error } = ruleExecutionStatus;
        const { snoozed } = ruleSnoozedStatus;
        setRuleStats({
          ...ruleStats,
          total,
          disabled,
          muted,
          error,
          snoozed,
        });
      }
      setRuleStatsLoading(false);
    } catch (_e) {
      toasts.addDanger({
        title: i18n.translate('xpack.observability.alerts.ruleStats.loadError', {
          defaultMessage: 'Unable to load rule stats',
        }),
      });
      setRuleStatsLoading(false);
    }
  }

  useEffect(() => {
    loadRuleStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manageRulesHref = http.basePath.prepend('/app/observability/alerts/rules');

  // If there is any data, set hasData to true otherwise we need to wait till all the data is loaded before setting hasData to true or false; undefined indicates the data is still loading.
  const hasData = hasAnyData === true || (isAllRequestsComplete === false ? undefined : false);

  const CasesContext = cases.ui.getCasesContext();
  const userCasesPermissions = useGetUserCasesPermissions();

  if (!hasAnyData && !isAllRequestsComplete) {
    return <LoadingObservability />;
  }

  const noDataConfig = getNoDataConfig({
    hasData,
    basePath: http.basePath,
    docsLink: docLinks.links.observability.guide,
  });

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      isPageDataLoaded={isAllRequestsComplete}
      data-test-subj={noDataConfig ? 'noDataPage' : 'alertsPageWithData'}
      pageHeader={{
        pageTitle: (
          <>{i18n.translate('xpack.observability.alertsTitle', { defaultMessage: 'Alerts' })} </>
        ),
        rightSideItems: renderRuleStats(ruleStats, manageRulesHref, ruleStatsLoading),
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <ObservabilityAlertSearchbarWithUrlSync
            appName={ALERTS_SEARCH_BAR_ID}
            setEsQuery={setEsQuery}
            urlStorageKey={URL_STORAGE_KEY}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <CasesContext
            owner={[observabilityFeatureId]}
            permissions={userCasesPermissions}
            features={{ alerts: { sync: false } }}
          >
            {esQuery && (
              <AlertsStateTable
                alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                configurationId={AlertConsumers.OBSERVABILITY}
                id={ALERTS_TABLE_ID}
                flyoutSize={'s' as EuiFlyoutSize}
                featureIds={observabilityAlertFeatureIds}
                query={esQuery}
                showExpandToDetails={false}
                pageSize={ALERTS_PER_PAGE}
              />
            )}
          </CasesContext>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
