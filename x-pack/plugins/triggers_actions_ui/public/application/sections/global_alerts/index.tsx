/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useEffect, useMemo, useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiDataGridColumn, EuiFlexGroup, EuiStat } from '@elastic/eui';
import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  ALERT_RULE_PRODUCER,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_TIME_RANGE,
  AlertConsumers,
  DefaultAlertFieldName,
} from '@kbn/rule-data-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  BoolQuery,
  buildEsQuery as kbnBuildEsQuery,
  EsQueryConfig,
  Filter,
  FILTERS,
  PhraseFilter,
  PhrasesFilter,
  Query,
  TimeRange,
} from '@kbn/es-query';
import { getTime } from '@kbn/data-plugin/common';
import { QuickFiltersMenuItem } from '@kbn/unified-search-plugin/public/query_string_input/quick_filters';
import { NON_SIEM_FEATURE_IDS } from '../alerts_search_bar/constants';
import {
  alertProducersData,
  observabilityApps,
  observabilityProducers,
} from '../alerts_table/constants';
import { UrlSyncedAlertsSearchBar } from '../alerts_search_bar/url_synced_alerts_search_bar';
import { ALERT_TABLE_GENERIC_CONFIG_ID } from '../../../../common';
import { AlertTableConfigRegistry } from '../../alert_table_config_registry';
import { loadRuleAggregations } from '../../..';
import { useKibana } from '../../../common/lib/kibana';
import { alertsTableQueryClient } from '../alerts_table/query_client';
import {
  alertSearchBarStateContainer,
  Provider,
} from '../alerts_search_bar/use_alert_search_bar_state_container';
const AlertsTable = lazy(() => import('../alerts_table/alerts_table_state'));

const Stat = styled(EuiStat)`
  .euiText {
    line-height: 1;
  }
`;

interface StatsProps {
  stats: {
    total: number;
    disabled: number;
    muted: number;
    error: number;
    snoozed: number;
  };
  loading: boolean;
  manageRulesHref: string;
}

const Divider = styled.div`
  border-right: 1px solid ${euiThemeVars.euiColorLightShade};
  height: 100%;
`;

const SOLUTION_OR_APP_TITLE = i18n.translate(
  'xpack.triggersActionsUI.sections.globalAlerts.quickFilters.solutionOrApp',
  {
    defaultMessage: 'Solution/app',
  }
);

const getStatNodes = ({ stats, loading, manageRulesHref }: StatsProps) => {
  const disabledStatsComponent = (
    <Stat
      title={stats.disabled}
      description={i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.disabled', {
        defaultMessage: 'Disabled',
      })}
      color="primary"
      titleColor={stats.disabled > 0 ? 'primary' : ''}
      titleSize="xs"
      isLoading={loading}
      data-test-subj="statDisabled"
    />
  );

  const snoozedStatsComponent = (
    <Stat
      title={stats.muted + stats.snoozed}
      description={i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.muted', {
        defaultMessage: 'Snoozed',
      })}
      color="primary"
      titleColor={stats.muted + stats.snoozed > 0 ? 'primary' : ''}
      titleSize="xs"
      isLoading={loading}
      data-test-subj="statMuted"
    />
  );

  const errorStatsComponent = (
    <Stat
      title={stats.error}
      description={i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.errors', {
        defaultMessage: 'Errors',
      })}
      color="primary"
      titleColor={stats.error > 0 ? 'primary' : ''}
      titleSize="xs"
      isLoading={loading}
      data-test-subj="statErrors"
    />
  );

  return [
    <Stat
      title={stats.total}
      description={i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.ruleCount', {
        defaultMessage: 'Rule count',
      })}
      color="primary"
      titleSize="xs"
      isLoading={loading}
      data-test-subj="statRuleCount"
    />,
    disabledStatsComponent,
    snoozedStatsComponent,
    errorStatsComponent,
    <Divider />,
    <EuiButtonEmpty data-test-subj="manageRulesPageButton" href={manageRulesHref}>
      {i18n.translate('xpack.triggersActionsUI.globalAlerts.manageRulesButtonLabel', {
        defaultMessage: 'Manage Rules',
      })}
    </EuiButtonEmpty>,
  ].reverse();
};

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

const createMatchPhraseFilter = (field: DefaultAlertFieldName, value: unknown) =>
  ({
    meta: {
      field,
      type: FILTERS.PHRASE,
      key: field,
      alias: null,
      disabled: false,
      index: undefined,
      negate: false,
      params: { query: value },
      value: undefined,
    },
    query: {
      match_phrase: {
        [field]: value,
      },
    },
  } as PhraseFilter);

const createRuleProducerFilter = (producer: AlertConsumers) =>
  createMatchPhraseFilter(ALERT_RULE_PRODUCER, producer);

export const GlobalAlerts = () => {
  const {
    http,
    chrome: { docTitle, setBreadcrumbs },
    notifications: { toasts },
    alertsTableConfigurationRegistry,
  } = useKibana().services;
  const [esQuery, setEsQuery] = useState({ bool: {} } as { bool: BoolQuery });
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [featureIds, setFeatureIds] = useState(NON_SIEM_FEATURE_IDS);
  const [filteringBySolution, setFilteringBySolution] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    disabled: 0,
    muted: 0,
    error: 0,
    snoozed: 0,
  });
  const manageRulesHref = http.basePath.prepend(
    '/app/management/insightsAndAlerting/triggersActions/rules'
  );
  const browsingSiem = useMemo(
    () => featureIds.length === 1 && featureIds[0] === AlertConsumers.SIEM,
    [featureIds]
  );
  const quickFilters = useMemo<QuickFiltersMenuItem[]>(
    () => [
      {
        groupName: SOLUTION_OR_APP_TITLE,
        items: [
          {
            name: alertProducersData[AlertConsumers.SIEM].displayName,
            icon: 'logoSecurity',
            filter: createRuleProducerFilter(AlertConsumers.SIEM),
            disabled: filteringBySolution && !browsingSiem,
          },
          {
            name: alertProducersData[AlertConsumers.OBSERVABILITY].displayName,
            icon: 'logoObservability',
            disabled: filteringBySolution && browsingSiem,
            filter: {
              meta: {
                field: ALERT_RULE_PRODUCER,
                type: FILTERS.PHRASES,
                key: ALERT_RULE_PRODUCER,
                alias: null,
                disabled: false,
                index: undefined,
                negate: false,
                params: observabilityProducers,
                value: undefined,
              },
              query: {
                bool: {
                  minimum_should_match: 1,
                  should: observabilityProducers.map((p) => ({
                    match_phrase: {
                      [ALERT_RULE_PRODUCER]: p,
                    },
                  })),
                },
              },
            } as PhrasesFilter,
          },
          ...observabilityApps.map((oa) => {
            const { displayName, icon } = alertProducersData[oa];
            return {
              name: displayName,
              icon,
              filter: createRuleProducerFilter(oa),
              disabled: filteringBySolution && browsingSiem,
            };
          }),
          {
            name: alertProducersData[AlertConsumers.ML].displayName,
            icon: 'machineLearningApp',
            filter: createRuleProducerFilter('ml'),
            disabled: filteringBySolution && browsingSiem,
          },
          {
            name: alertProducersData[AlertConsumers.STACK_ALERTS].displayName,
            icon: 'managementApp',
            filter: createRuleProducerFilter('stackAlerts'),
            disabled: filteringBySolution && browsingSiem,
          },
        ],
      },
      {
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
      },
    ],
    [browsingSiem, filteringBySolution]
  );
  const columns = useMemo<EuiDataGridColumn[]>(() => {
    const [first, ...otherCols] = alertsTableConfigurationRegistry.get(
      ALERT_TABLE_GENERIC_CONFIG_ID
    ).columns;
    return [
      first,
      {
        displayAsText: SOLUTION_OR_APP_TITLE,
        id: ALERT_RULE_PRODUCER,
        schema: 'string',
        initialWidth: 180,
      },
      ...otherCols,
    ];
  }, [alertsTableConfigurationRegistry]);

  async function loadRuleStats() {
    setStatsLoading(true);
    try {
      const response = await loadRuleAggregations({
        http,
      });
      const { ruleExecutionStatus, ruleMutedStatus, ruleEnabledStatus, ruleSnoozedStatus } =
        response;
      if (ruleExecutionStatus && ruleMutedStatus && ruleEnabledStatus && ruleSnoozedStatus) {
        const total = Object.values(ruleExecutionStatus).reduce((acc, value) => acc + value, 0);
        const { disabled } = ruleEnabledStatus;
        const { muted } = ruleMutedStatus;
        const { error } = ruleExecutionStatus;
        const { snoozed } = ruleSnoozedStatus;
        setStats({
          ...stats,
          total,
          disabled,
          muted,
          error,
          snoozed,
        });
      }
      setStatsLoading(false);
    } catch (_e) {
      toasts.addDanger({
        title: i18n.translate('xpack.triggersActionsUI.globalAlerts.alertStats.loadError', {
          defaultMessage: 'Unable to load rule stats',
        }),
      });
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    loadRuleStats();
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.triggersActionsUI.globalAlerts.alerts', {
          defaultMessage: 'Alerts',
        }),
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Provider value={alertSearchBarStateContainer}>
      <QueryClientProvider client={alertsTableQueryClient}>
        <KibanaPageTemplate
          pageHeader={{
            pageTitle: (
              <>
                {i18n.translate('xpack.triggersActionsUI.globalAlerts.title', {
                  defaultMessage: 'Alerts',
                })}{' '}
              </>
            ),
            rightSideItems: getStatNodes({ stats, loading: statsLoading, manageRulesHref }),
          }}
        >
          <KibanaPageTemplate.Section>
            <EuiFlexGroup gutterSize="m" direction="column">
              <UrlSyncedAlertsSearchBar
                appName="test"
                featureIds={featureIds}
                onFeatureIdsChange={setFeatureIds}
                showFilterBar
                quickFilters={quickFilters}
                onFilteringBySolutionChange={setFilteringBySolution}
                onEsQueryChange={setEsQuery}
              />
              <AlertsTable
                id="rule-detail-alerts-table"
                configurationId={ALERT_TABLE_GENERIC_CONFIG_ID}
                alertsTableConfigurationRegistry={
                  alertsTableConfigurationRegistry as AlertTableConfigRegistry
                }
                columns={columns}
                featureIds={featureIds}
                query={esQuery}
                showAlertStatusWithFlapping
                pageSize={20}
              />
            </EuiFlexGroup>
          </KibanaPageTemplate.Section>
        </KibanaPageTemplate>
      </QueryClientProvider>
    </Provider>
  );
};

// eslint-disable-next-line import/no-default-export
export default GlobalAlerts;
