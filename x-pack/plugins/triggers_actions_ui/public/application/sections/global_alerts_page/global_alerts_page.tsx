/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiLoadingSpinner, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_TIME_RANGE,
  AlertConsumers,
} from '@kbn/rule-data-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  BoolQuery,
  buildEsQuery as kbnBuildEsQuery,
  EsQueryConfig,
  Filter,
  Query,
  TimeRange,
} from '@kbn/es-query';
import { getTime } from '@kbn/data-plugin/common';
import { QuickFiltersMenuItem } from '@kbn/unified-search-plugin/public/query_string_input/quick_filters';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoPermissionPrompt } from '../../components/prompts/no_permission_prompt';
import { ALERT_TABLE_GLOBAL_CONFIG_ID } from '../../constants';
import { useRuleStats } from './hooks/use_rule_stats';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';
import { NON_SIEM_FEATURE_IDS } from '../alerts_search_bar/constants';
import { alertProducersData } from '../alerts_table/constants';
import { UrlSyncedAlertsSearchBar } from '../alerts_search_bar/url_synced_alerts_search_bar';
import { useKibana } from '../../../common/lib/kibana';
import { alertsTableQueryClient } from '../alerts_table/query_client';
import {
  alertSearchBarStateContainer,
  Provider,
} from '../alerts_search_bar/use_alert_search_bar_state_container';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { createMatchPhraseFilter, createRuleTypesFilter } from '../../lib/search_filters';
import { useLoadRuleTypesQuery } from '../../hooks/use_load_rule_types_query';
import { nonNullable } from '../../../../common/utils';
import { useRuleTypeIdsByFeatureId } from './hooks/use_rule_type_ids_by_feature_id';
const AlertsTable = lazy(() => import('../alerts_table/alerts_table_state'));

interface BuildEsQueryArgs {
  timeRange?: TimeRange;
  kuery?: string;
  queries?: Query[];
  config?: EsQueryConfig;
  filters?: Filter[];
}

export function buildEsQuery({
  timeRange,
  kuery,
  filters = [],
  queries = [],
  config = {},
}: BuildEsQueryArgs) {
  const timeFilter =
    timeRange &&
    getTime(undefined, timeRange, {
      fieldName: ALERT_TIME_RANGE,
    });
  const filtersToUse = [...(timeFilter ? [timeFilter] : []), ...filters];
  const kueryFilter = kuery ? [{ query: kuery, language: 'kuery' }] : [];
  const queryToUse = [...kueryFilter, ...queries];
  return kbnBuildEsQuery(undefined, queryToUse, filtersToUse, config);
}

/**
 * A unified view for all types of alerts
 */
export const GlobalAlertsPage = () => {
  return (
    <Provider value={alertSearchBarStateContainer}>
      <QueryClientProvider client={alertsTableQueryClient}>
        <PageContent />
      </QueryClientProvider>
    </Provider>
  );
};

const getFeatureFilterLabel = (featureName: string) =>
  i18n.translate('xpack.triggersActionsUI.sections.globalAlertsPage.featureRuleTypes', {
    defaultMessage: '{feature} rule types',
    values: {
      feature: featureName,
    },
  });

const PageContent = () => {
  const {
    chrome: { docTitle },
    setBreadcrumbs,
    alertsTableConfigurationRegistry,
  } = useKibana().services;
  const [esQuery, setEsQuery] = useState({ bool: {} } as { bool: BoolQuery });
  const [activeFeatureFilters, setActiveFeatureFilters] = useState<AlertConsumers[]>([]);

  const ruleStats = useRuleStats();
  const {
    ruleTypesState: { data: ruleTypesIndex, initialLoad: isInitialLoadingRuleTypes },
    authorizedToReadAnyRules,
  } = useLoadRuleTypesQuery({ filteredRuleTypes: [] });
  const ruleTypeIdsByFeatureId = useRuleTypeIdsByFeatureId(ruleTypesIndex);

  const browsingSiem = useMemo(
    () => activeFeatureFilters.length === 1 && activeFeatureFilters[0] === AlertConsumers.SIEM,
    [activeFeatureFilters]
  );
  const filteringBySolution = useMemo(
    () => activeFeatureFilters.length > 0,
    [activeFeatureFilters.length]
  );
  const featureIds = useMemo(
    () =>
      filteringBySolution
        ? browsingSiem
          ? [AlertConsumers.SIEM]
          : activeFeatureFilters
        : NON_SIEM_FEATURE_IDS,
    [activeFeatureFilters, browsingSiem, filteringBySolution]
  );
  const quickFilters = useMemo(() => {
    const filters: QuickFiltersMenuItem[] = [];
    if (Object.values(ruleTypeIdsByFeatureId).length > 0) {
      filters.push(
        ...Object.entries(ruleTypeIdsByFeatureId)
          .map(([featureId, ruleTypeIds]) => {
            const producerData = alertProducersData[featureId as AlertConsumers];
            if (!producerData) {
              return null;
            }
            const filterLabel = getFeatureFilterLabel(producerData.displayName);
            const disabled =
              filteringBySolution && featureId === AlertConsumers.SIEM
                ? !browsingSiem
                : browsingSiem;
            return {
              name: filterLabel,
              icon: producerData.icon,
              filter: createRuleTypesFilter(
                producerData.subFeatureIds ?? [featureId as AlertConsumers],
                filterLabel,
                ruleTypeIds
              ),
              disabled,
            };
          })
          .filter(nonNullable)
      );
    }
    filters.push({
      groupName: i18n.translate(
        'xpack.triggersActionsUI.sections.globalAlerts.quickFilters.status',
        {
          defaultMessage: 'Status',
        }
      ),
      items: [ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED, ALERT_STATUS_UNTRACKED].map((s) => ({
        name: s,
        filter: createMatchPhraseFilter(ALERT_STATUS, s),
      })),
    });
    return filters;
  }, [browsingSiem, filteringBySolution, ruleTypeIdsByFeatureId]);
  const tableConfigurationId = useMemo(
    // TODO in preparation for using solution-specific configurations
    () => ALERT_TABLE_GLOBAL_CONFIG_ID,
    []
  );

  useEffect(() => {
    setBreadcrumbs([getAlertingSectionBreadcrumb('alerts')]);
    docTitle.change(getCurrentDocTitle('alerts'));
  }, [docTitle, setBreadcrumbs]);

  return (
    <>
      <EuiPageTemplate.Header
        paddingSize="none"
        bottomBorder
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage
              id="xpack.triggersActionsUI.managementSection.alerts.displayName"
              defaultMessage="Alerts"
            />
          </span>
        }
        rightSideItems={ruleStats}
      />
      <EuiSpacer size="l" />
      {!isInitialLoadingRuleTypes && !authorizedToReadAnyRules ? (
        <NoPermissionPrompt />
      ) : (
        <EuiFlexGroup gutterSize="m" direction="column" data-test-subj="globalAlertsPageContent">
          <UrlSyncedAlertsSearchBar
            appName="test"
            featureIds={featureIds}
            showFilterBar
            quickFilters={quickFilters}
            onActiveFeatureFiltersChange={setActiveFeatureFilters}
            onEsQueryChange={setEsQuery}
          />
          <Suspense fallback={<EuiLoadingSpinner />}>
            <AlertsTable
              id="rule-detail-alerts-table"
              configurationId={tableConfigurationId}
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              featureIds={featureIds}
              query={esQuery}
              showAlertStatusWithFlapping
              pageSize={20}
            />
          </Suspense>
        </EuiFlexGroup>
      )}
    </>
  );
};
