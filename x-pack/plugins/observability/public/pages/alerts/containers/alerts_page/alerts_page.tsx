/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { DataViewBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { ALERT_STATUS, AlertStatus } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { loadRuleAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { ParsedExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { AlertStatusFilterButton } from '../../../../../common/typings';
import { useGetUserCasesPermissions } from '../../../../hooks/use_get_user_cases_permissions';
import { observabilityFeatureId } from '../../../../../common';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { useAlertIndexNames } from '../../../../hooks/use_alert_index_names';
import { useHasData } from '../../../../hooks/use_has_data';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useTimefilterService } from '../../../../hooks/use_timefilter_service';
import { getNoDataConfig } from '../../../../utils/no_data_config';
import { LoadingObservability } from '../../../overview/loading_observability';
import { AlertsTableTGrid } from '../alerts_table_t_grid';
import {
  Provider,
  alertsPageStateContainer,
  useAlertsPageStateContainer,
} from '../state_container';
import './styles.scss';
import { AlertsStatusFilter, AlertsSearchBar } from '../../components';
import { renderRuleStats } from '../../components/rule_stats';
import { ObservabilityAppServices } from '../../../../application/types';

interface RuleStatsState {
  total: number;
  disabled: number;
  muted: number;
  error: number;
  snoozed: number;
}

export interface TopAlert {
  fields: ParsedTechnicalFields & ParsedExperimentalFields;
  start: number;
  lastUpdated: number;
  reason: string;
  link?: string;
  active: boolean;
}

const regExpEscape = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
const NO_INDEX_PATTERNS: DataViewBase[] = [];
const BASE_ALERT_REGEX = new RegExp(`\\s*${regExpEscape(ALERT_STATUS)}\\s*:\\s*"(.*?|\\*?)"`);
const ALERT_STATUS_REGEX = new RegExp(
  `\\s*and\\s*${regExpEscape(ALERT_STATUS)}\\s*:\\s*(".+?"|\\*?)|${regExpEscape(
    ALERT_STATUS
  )}\\s*:\\s*(".+?"|\\*?)`,
  'gm'
);

const ALERT_TABLE_STATE_STORAGE_KEY = 'xpack.observability.alert.tableState';

function AlertsPage() {
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();
  const [alertFilterStatus, setAlertFilterStatus] = useState('' as AlertStatusFilterButton);
  const refetch = useRef<() => void>();
  const timefilterService = useTimefilterService();
  const { rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery } =
    useAlertsPageStateContainer();
  const {
    cases,
    dataViews,
    docLinks,
    http,
    notifications: { toasts },
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
  const indexNames = useAlertIndexNames();

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

  const dynamicIndexPatternsAsyncState = useAsync(async (): Promise<DataViewBase[]> => {
    if (indexNames.length === 0) {
      return [];
    }

    return [
      {
        id: 'dynamic-observability-alerts-table-index-pattern',
        title: indexNames.join(','),
        fields: await dataViews.getFieldsForWildcard({
          pattern: indexNames.join(','),
          allowNoIndex: true,
        }),
      },
    ];
  }, [indexNames]);

  const onQueryChange = useCallback(
    ({ dateRange, query }) => {
      if (rangeFrom === dateRange.from && rangeTo === dateRange.to && kuery === (query ?? '')) {
        return refetch.current && refetch.current();
      }
      timefilterService.setTime(dateRange);
      setRangeFrom(dateRange.from);
      setRangeTo(dateRange.to);
      setKuery(query);
      syncAlertStatusFilterStatus(query as string);
    },
    [rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery, timefilterService]
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
      let output = kuery;
      if (kuery === '') {
        output = query;
      } else {
        // console.log(ALERT_STATUS_REGEX);
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

  const setRefetch = useCallback((ref) => {
    refetch.current = ref;
  }, []);

  const { hasAnyData, isAllRequestsComplete } = useHasData();

  // If there is any data, set hasData to true otherwise we need to wait till all the data is loaded before setting hasData to true or false; undefined indicates the data is still loading.
  const hasData = hasAnyData === true || (isAllRequestsComplete === false ? undefined : false);

  const CasesContext = cases.ui.getCasesContext();
  const userPermissions = useGetUserCasesPermissions();

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
      isPageDataLoaded={Boolean(hasAnyData || isAllRequestsComplete)}
      data-test-subj={noDataConfig ? 'noDataPage' : undefined}
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
            dynamicIndexPatterns={dynamicIndexPatternsAsyncState.value ?? NO_INDEX_PATTERNS}
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
            permissions={userPermissions}
            features={{ alerts: { sync: false } }}
          >
            <AlertsTableTGrid
              indexNames={indexNames}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              kuery={kuery}
              setRefetch={setRefetch}
              stateStorageKey={ALERT_TABLE_STATE_STORAGE_KEY}
              storage={new Storage(window.localStorage)}
              itemsPerPage={50}
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
