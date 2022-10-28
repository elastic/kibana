/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFlyoutSize } from '@elastic/eui';

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { loadRuleAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertConsumers, AlertStatus } from '@kbn/rule-data-utils';
import { observabilityAlertFeatureIds } from '../../../../config';
import { AlertStatusFilterButton } from '../../../../../common/typings';
import { useGetUserCasesPermissions } from '../../../../hooks/use_get_user_cases_permissions';
import { observabilityFeatureId } from '../../../../../common';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { useHasData } from '../../../../hooks/use_has_data';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { getNoDataConfig } from '../../../../utils/no_data_config';
import { buildEsQuery } from '../../../../utils/build_es_query';
import { LoadingObservability } from '../../../overview';
import {
  Provider,
  alertsPageStateContainer,
  useAlertsPageStateContainer,
} from '../state_container';
import './styles.scss';
import { AlertsStatusFilter, AlertsSearchBar, ALL_ALERTS } from '../../components';
import { renderRuleStats } from '../../components/rule_stats';
import { ObservabilityAppServices } from '../../../../application/types';
import {
  ALERT_STATUS_REGEX,
  ALERTS_PER_PAGE,
  ALERTS_TABLE_ID,
  BASE_ALERT_REGEX,
} from './constants';
import { RuleStatsState } from './types';

function AlertsPage() {
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();
  const [alertFilterStatus, setAlertFilterStatus] = useState(
    ALL_ALERTS.query as AlertStatusFilterButton
  );
  const [refreshNow, setRefreshNow] = useState<number>();
  const { rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery } =
    useAlertsPageStateContainer();
  const {
    cases,
    docLinks,
    http,
    notifications: { toasts },
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
    data: {
      query: {
        timefilter: { timefilter: timeFilterService },
      },
    },
  } = useKibana<ObservabilityAppServices>().services;

  const [ruleStatsLoading, setRuleStatsLoading] = useState<boolean>(false);
  const [ruleStats, setRuleStats] = useState<RuleStatsState>({
    total: 0,
    disabled: 0,
    muted: 0,
    error: 0,
    snoozed: 0,
  });

  useEffect(() => {
    syncAlertStatusFilterStatus(kuery as string);
  }, [kuery]);

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

  const onRefresh = () => {
    setRefreshNow(new Date().getTime());
  };

  const onQueryChange = useCallback(
    ({ dateRange, query }) => {
      if (rangeFrom === dateRange.from && rangeTo === dateRange.to && kuery === (query ?? '')) {
        return onRefresh();
      }
      timeFilterService.setTime(dateRange);
      setRangeFrom(dateRange.from);
      setRangeTo(dateRange.to);
      setKuery(query);
      syncAlertStatusFilterStatus(query as string);
    },
    [rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery, timeFilterService]
  );

  const syncAlertStatusFilterStatus = (query: string) => {
    const [, alertStatus] = BASE_ALERT_REGEX.exec(query) || [];
    if (!alertStatus) {
      setAlertFilterStatus('');
      return;
    }
    setAlertFilterStatus(alertStatus.toLowerCase() as AlertStatus);
  };
  const setAlertStatusFilter = useCallback(
    (id: string, query: string) => {
      setAlertFilterStatus(id as AlertStatusFilterButton);
      // Updating the KQL query bar alongside with user inputs is tricky.
      // To avoid issue, this function always remove the AlertFilter and add it
      // at the end of the query, each time the filter is added/updated/removed (Show All)
      // NOTE: This (query appending) will be changed entirely: https://github.com/elastic/kibana/issues/116135
      let output;
      if (kuery === '') {
        output = query;
      } else {
        const queryWithoutAlertFilter = kuery.replace(ALERT_STATUS_REGEX, '');
        output = `${queryWithoutAlertFilter} and ${query}`;
      }
      onQueryChange({
        dateRange: { from: rangeFrom, to: rangeTo },
        // Clean up the kuery from unwanted trailing/ahead ANDs after appending and removing filters.
        query: output.replace(/^\s*and\s*|\s*and\s*$/gm, ''),
      });
    },
    [kuery, onQueryChange, rangeFrom, rangeTo]
  );

  const { hasAnyData, isAllRequestsComplete } = useHasData();

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
          <AlertsSearchBar
            featureIds={observabilityAlertFeatureIds}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            query={kuery}
            onQueryChange={onQueryChange}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <AlertsStatusFilter status={alertFilterStatus} onChange={setAlertStatusFilter} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <CasesContext
            owner={[observabilityFeatureId]}
            permissions={userCasesPermissions}
            features={{ alerts: { sync: false } }}
          >
            <AlertsStateTable
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              configurationId={AlertConsumers.OBSERVABILITY}
              id={ALERTS_TABLE_ID}
              flyoutSize={'s' as EuiFlyoutSize}
              featureIds={observabilityAlertFeatureIds}
              query={buildEsQuery(
                {
                  to: rangeTo,
                  from: rangeFrom,
                },
                kuery
              )}
              showExpandToDetails={false}
              pageSize={ALERTS_PER_PAGE}
              refreshNow={refreshNow}
            />
          </CasesContext>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}

export function WrappedAlertsPage() {
  return (
    <Provider value={alertsPageStateContainer}>
      <AlertsPage />
    </Provider>
  );
}
