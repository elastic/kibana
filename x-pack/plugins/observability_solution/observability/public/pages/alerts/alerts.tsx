/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrushEndListener, XYBrushEvent } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { BoolQuery, Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { loadRuleAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertsGrouping } from '@kbn/alerts-ui-shared/src/alerts_grouping/components/alerts_grouping';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { MaintenanceWindowCallout } from '@kbn/alerts-ui-shared';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { AlertConsumers } from '@kbn/rule-data-utils';
import { observabilityFeatureId, rulesLocatorID } from '../../../common';
import { RulesParams } from '../../locators/rules';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeBuckets } from '../../hooks/use_time_buckets';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { useToasts } from '../../hooks/use_toast';
import { renderRuleStats, RuleStatsState } from './components/rule_stats';
import { ObservabilityAlertSearchBar } from '../../components/alert_search_bar/alert_search_bar';
import {
  alertSearchBarStateContainer,
  Provider,
  useAlertSearchBarStateContainer,
} from '../../components/alert_search_bar/containers';
import { calculateTimeRangeBucketSize } from '../overview/helpers/calculate_bucket_size';
import { getAlertSummaryTimeRange } from '../../utils/alert_summary_widget';
import { observabilityAlertFeatureIds } from '../../../common/constants';
import { ALERTS_URL_STORAGE_KEY } from '../../../common/constants';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { useGetAvailableRulesWithDescriptions } from '../../hooks/use_get_available_rules_with_descriptions';
import { buildEsQuery } from '../../utils/build_es_query';

const ALERTS_SEARCH_BAR_ID = 'alerts-search-bar-o11y';
const ALERTS_PER_PAGE = 50;
const ALERTS_TABLE_ID = 'xpack.observability.alerts.alert.table';

const DEFAULT_INTERVAL = '60s';
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm';

const DEFAULT_GROUPING_OPTIONS = [
  {
    label: 'Rule name',
    key: 'kibana.alert.rule.name',
  },
  {
    label: 'Status',
    key: 'kibana.alert.status',
  },
  {
    label: 'Host name',
    key: 'host.name',
  },
  {
    label: 'Host ip',
    key: 'host.ip',
  },
];

const getAggregationsByGroupingField = (field: string): any[] => {
  const aggMetrics: any[] = [
    {
      unitsCount: {
        cardinality: {
          field: 'kibana.alert.uuid',
        },
      },
    },
  ];
  switch (field) {
    case 'kibana.alert.rule.name':
      aggMetrics.push(
        ...[
          {
            description: {
              terms: {
                field: 'kibana.alert.rule.description',
                size: 1,
              },
            },
          },
          {
            usersCountAggregation: {
              cardinality: {
                field: 'user.name',
              },
            },
          },
          {
            hostsCountAggregation: {
              cardinality: {
                field: 'host.name',
              },
            },
          },
          {
            ruleTags: {
              terms: {
                field: 'kibana.alert.rule.tags',
              },
            },
          },
        ]
      );
      break;
    case 'host.name':
      aggMetrics.push(
        ...[
          {
            rulesCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.rule_id',
              },
            },
          },
          {
            countSeveritySubAggregation: {
              cardinality: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            severitiesSubAggregation: {
              terms: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            usersCountAggregation: {
              cardinality: {
                field: 'user.name',
              },
            },
          },
        ]
      );
      break;
    case 'user.name':
      aggMetrics.push(
        ...[
          {
            rulesCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.rule_id',
              },
            },
          },
          {
            countSeveritySubAggregation: {
              cardinality: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            severitiesSubAggregation: {
              terms: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            hostsCountAggregation: {
              cardinality: {
                field: 'host.name',
              },
            },
          },
        ]
      );
      break;
    case 'source.ip':
      aggMetrics.push(
        ...[
          {
            rulesCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.rule_id',
              },
            },
          },
          {
            countSeveritySubAggregation: {
              cardinality: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            severitiesSubAggregation: {
              terms: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            hostsCountAggregation: {
              cardinality: {
                field: 'host.name',
              },
            },
          },
        ]
      );
      break;
    default:
      aggMetrics.push({
        rulesCountAggregation: {
          cardinality: {
            field: 'kibana.alert.rule.rule_id',
          },
        },
      });
  }
  return aggMetrics;
};

function InternalAlertsPage() {
  const kibanaServices = useKibana().services;
  const {
    charts,
    data,
    http,
    notifications,
    dataViews,
    observabilityAIAssistant,
    share: {
      url: { locators },
    },
    triggersActionsUi: {
      alertsTableConfigurationRegistry,
      getAlertsSearchBar: AlertsSearchBar,
      getAlertsStateTable: AlertsStateTable,
      getAlertSummaryWidget: AlertSummaryWidget,
    },
    uiSettings,
    storage,
  } = kibanaServices;
  const { toasts } = notifications;
  const {
    query: {
      timefilter: { timefilter: timeFilterService },
    },
  } = data;
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();
  const alertSearchBarStateProps = useAlertSearchBarStateContainer(ALERTS_URL_STORAGE_KEY, {
    replace: false,
  });

  const filteredRuleTypes = useGetFilteredRuleTypes();

  const { setScreenContext } = observabilityAIAssistant?.service || {};

  const ruleTypesWithDescriptions = useGetAvailableRulesWithDescriptions();

  useEffect(() => {
    return setScreenContext?.({
      data: ruleTypesWithDescriptions.map((rule) => ({
        name: rule.id,
        value: `${rule.name} ${rule.description}`,
        description: `An available rule is ${rule.name}.`,
      })),
      starterPrompts: [
        {
          title: i18n.translate('xpack.observability.app.starterPrompts.explainRules.title', {
            defaultMessage: 'Explain',
          }),
          prompt: i18n.translate('xpack.observability.app.starterPrompts.explainRules.prompt', {
            defaultMessage: `Can you explain the rule types that are available?`,
          }),
          icon: 'sparkles',
        },
      ],
    });
  }, [filteredRuleTypes, ruleTypesWithDescriptions, setScreenContext]);

  const onBrushEnd: BrushEndListener = (brushEvent) => {
    const { x } = brushEvent as XYBrushEvent;
    if (x) {
      const [start, end] = x;
      alertSearchBarStateProps.onRangeFromChange(new Date(start).toISOString());
      alertSearchBarStateProps.onRangeToChange(new Date(end).toISOString());
    }
  };
  const chartProps = {
    baseTheme: charts.theme.useChartsBaseTheme(),
    onBrushEnd,
  };
  const [ruleStatsLoading, setRuleStatsLoading] = useState<boolean>(false);
  const [ruleStats, setRuleStats] = useState<RuleStatsState>({
    total: 0,
    disabled: 0,
    muted: 0,
    error: 0,
    snoozed: 0,
  });
  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();
  const timeBuckets = useTimeBuckets();
  const bucketSize = useMemo(
    () =>
      calculateTimeRangeBucketSize(
        {
          from: alertSearchBarStateProps.rangeFrom,
          to: alertSearchBarStateProps.rangeTo,
        },
        timeBuckets
      ),
    [alertSearchBarStateProps.rangeFrom, alertSearchBarStateProps.rangeTo, timeBuckets]
  );
  const alertSummaryTimeRange = useMemo(
    () =>
      getAlertSummaryTimeRange(
        {
          from: alertSearchBarStateProps.rangeFrom,
          to: alertSearchBarStateProps.rangeTo,
        },
        bucketSize?.intervalString || DEFAULT_INTERVAL,
        bucketSize?.dateFormat || DEFAULT_DATE_FORMAT
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alertSearchBarStateProps.rangeFrom, alertSearchBarStateProps.rangeTo, bucketSize, esQuery]
  );

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
        typesFilter: filteredRuleTypes,
        filterConsumers: observabilityAlertFeatureIds,
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

  const renderAlertsTable = useCallback(
    (groupingFilters: Filter[]) => {
      const query = buildEsQuery({
        filters: groupingFilters,
      });
      return (
        <AlertsStateTable
          id={observabilityFeatureId}
          featureIds={observabilityAlertFeatureIds}
          configurationId={AlertConsumers.OBSERVABILITY}
          query={query}
          showAlertStatusWithFlapping
          pageSize={ALERTS_PER_PAGE}
          cellContext={{ observabilityRuleTypeRegistry }}
          alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
        />
      );
    },
    [AlertsStateTable, alertsTableConfigurationRegistry, observabilityRuleTypeRegistry]
  );

  return (
    <Provider value={alertSearchBarStateContainer}>
      <ObservabilityPageTemplate
        data-test-subj="alertsPageWithData"
        pageHeader={{
          pageTitle: (
            <>{i18n.translate('xpack.observability.alertsTitle', { defaultMessage: 'Alerts' })} </>
          ),
          rightSideItems: renderRuleStats(
            ruleStats,
            manageRulesHref,
            ruleStatsLoading,
            locators.get<RulesParams>(rulesLocatorID)
          ),
        }}
      >
        <HeaderMenu />
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <MaintenanceWindowCallout
              kibanaServices={kibanaServices}
              categories={[DEFAULT_APP_CATEGORIES.observability.id]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ObservabilityAlertSearchBar
              {...alertSearchBarStateProps}
              appName={ALERTS_SEARCH_BAR_ID}
              onEsQueryChange={setEsQuery}
              showFilterBar
              services={{ timeFilterService, AlertsSearchBar, useToasts, uiSettings }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertSummaryWidget
              featureIds={observabilityAlertFeatureIds}
              filter={esQuery}
              fullSize
              timeRange={alertSummaryTimeRange}
              chartProps={chartProps}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {esQuery && (
              <AlertsGrouping
                featureIds={observabilityAlertFeatureIds}
                defaultFilters={[]}
                from={alertSearchBarStateProps.rangeFrom}
                globalFilters={alertSearchBarStateProps.filters}
                globalQuery={{ query: alertSearchBarStateProps.kuery, language: 'kql' }}
                hasIndexMaintenance={false}
                hasIndexWrite={false}
                loading={false}
                renderChildComponent={renderAlertsTable}
                tableId={observabilityFeatureId}
                to={alertSearchBarStateProps.rangeTo}
                defaultGroupingOptions={DEFAULT_GROUPING_OPTIONS}
                getAggregationsByGroupingField={getAggregationsByGroupingField}
                services={{
                  uiSettings,
                  storage,
                  notifications,
                  dataViews,
                  http,
                  data,
                }}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </ObservabilityPageTemplate>
    </Provider>
  );
}

export function AlertsPage() {
  return (
    <Provider value={alertSearchBarStateContainer}>
      <InternalAlertsPage />
    </Provider>
  );
}
