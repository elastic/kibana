/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BrushEndListener, XYBrushEvent } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { BoolQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { loadRuleAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { CoPilotContextProvider } from '../..';
import { CoPilotPromptId } from '../../../common';

import { CoPilotPrompt, useCoPilot } from '../..';
import { useKibana } from '../../utils/kibana_react';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeBuckets } from '../../hooks/use_time_buckets';
import { useToasts } from '../../hooks/use_toast';
import { LoadingObservability } from '../../components/loading_observability';
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

const ALERTS_SEARCH_BAR_ID = 'alerts-search-bar-o11y';
const ALERTS_PER_PAGE = 50;
const ALERTS_TABLE_ID = 'xpack.observability.alerts.alert.table';

const DEFAULT_INTERVAL = '60s';
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm';

const mapCopilotParams = (alerts: any[], cases: any) => {
  return Promise.all(
    alerts.map(async (alert: any) => {
      const caseIds = alert['kibana.alert.case_ids']
        ? alert['kibana.alert.case_ids'].join(',')
        : undefined;
      const mappedData = {
        id: alert['kibana.alert.uuid'].join(','),
        alertUrl: alert['kibana.alert.url'],
        reason: alert['kibana.alert.reason'].join(','),
        start: alert['kibana.alert.start'].join(','),
        ruleName: alert['kibana.alert.rule.name'].join(','),
        ruleCategory: alert['kibana.alert.rule.category'].join(','),
        caseIds,
        cases: undefined,
      };

      if (caseIds) {
        const caseData = await cases.api.cases.bulkGet({ ids: alert['kibana.alert.case_ids'] });
        mappedData.cases = caseData.cases
          ? caseData.cases.map((item: any) => ({
              id: item.id,
              name: item.title,
              status: item.status,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              duration: item.duration,
              severity: item.severity,
              assignees: item.assignees.length,
              totalAlerts: item.totalAlerts,
              category: item.category,
              tags: item.tags.join(','),
              totalComment: item.totalComment,
            }))
          : undefined;
      }

      return mappedData;
    })
  );
};

function InternalAlertsPage() {
  const {
    cases,
    charts,
    data: {
      query: {
        timefilter: { timefilter: timeFilterService },
      },
    },
    http,
    notifications: { toasts },
    triggersActionsUi: {
      alertsTableConfigurationRegistry,
      getAlertsSearchBar: AlertsSearchBar,
      getAlertsStateTable: AlertsStateTable,
      getAlertSummaryWidget: AlertSummaryWidget,
    },
  } = useKibana().services;
  const coPilotService = useCoPilot();
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();
  const alertSearchBarStateProps = useAlertSearchBarStateContainer(ALERTS_URL_STORAGE_KEY, {
    replace: false,
  });

  const onBrushEnd: BrushEndListener = (brushEvent) => {
    const { x } = brushEvent as XYBrushEvent;
    if (x) {
      const [start, end] = x;
      alertSearchBarStateProps.onRangeFromChange(new Date(start).toISOString());
      alertSearchBarStateProps.onRangeToChange(new Date(end).toISOString());
    }
  };
  const chartProps = {
    theme: charts.theme.useChartsTheme(),
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
  const [alerts, setAlerts] = useState<any>();
  const { hasAnyData, isAllRequestsComplete } = useHasData();
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

  if (!hasAnyData && !isAllRequestsComplete) {
    return <LoadingObservability />;
  }

  return (
    <Provider value={alertSearchBarStateContainer}>
      <ObservabilityPageTemplate
        data-test-subj="alertsPageWithData"
        pageHeader={{
          pageTitle: (
            <>{i18n.translate('xpack.observability.alertsTitle', { defaultMessage: 'Alerts' })} </>
          ),
          rightSideItems: renderRuleStats(ruleStats, manageRulesHref, ruleStatsLoading),
        }}
      >
        {coPilotService?.isEnabled() ? (
          <EuiFlexItem grow={false}>
            <CoPilotPrompt
              coPilot={coPilotService}
              title={i18n.translate('xpack.observability.alerts.prioritizeAlerts.title', {
                defaultMessage: '🔥 What is on fire?',
              })}
              params={alerts}
              promptId={CoPilotPromptId.PrioritizeAlerts}
            />
            <EuiSpacer size="m" />
          </EuiFlexItem>
        ) : null}
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <ObservabilityAlertSearchBar
              {...alertSearchBarStateProps}
              appName={ALERTS_SEARCH_BAR_ID}
              onEsQueryChange={setEsQuery}
              services={{ timeFilterService, AlertsSearchBar, useToasts }}
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
              <AlertsStateTable
                alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                configurationId={AlertConsumers.OBSERVABILITY}
                id={ALERTS_TABLE_ID}
                flyoutSize="s"
                featureIds={observabilityAlertFeatureIds}
                query={esQuery}
                showExpandToDetails={false}
                showAlertStatusWithFlapping
                pageSize={ALERTS_PER_PAGE}
                onAlertsLoaded={async (alertList) => {
                  const alertCaseData = await mapCopilotParams(alertList, cases);
                  setAlerts({ alertCaseData });
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
  const { getCoPilotService } = useKibana().services;
  return (
    <CoPilotContextProvider value={getCoPilotService()}>
      <Provider value={alertSearchBarStateContainer}>
        <InternalAlertsPage />
      </Provider>
    </CoPilotContextProvider>
  );
}
