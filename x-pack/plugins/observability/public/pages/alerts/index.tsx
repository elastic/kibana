/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';

import { IndexPatternBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { ParsedTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import type { AlertWorkflowStatus } from '../../../common/typings';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetcher } from '../../hooks/use_fetcher';
import { useHasData } from '../../hooks/use_has_data';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimefilterService } from '../../hooks/use_timefilter_service';
import { callObservabilityApi } from '../../services/call_observability_api';
import { getNoDataConfig } from '../../utils/no_data_config';
import { LoadingObservability } from '../overview/loading_observability';
import { AlertsSearchBar } from './alerts_search_bar';
import { AlertsTableTGrid } from './alerts_table_t_grid';
import { Provider, alertsPageStateContainer, useAlertsPageStateContainer } from './state_container';
import './styles.scss';
import { WorkflowStatusFilter } from './workflow_status_filter';
import { AlertsDisclaimer } from './alerts_disclaimer';
import { loadAlertAggregations } from '../../../../../plugins/triggers_actions_ui/public';

interface AlertStatsState {
  isLoading: boolean;
  ruleCount: number;
  disabled: number;
  muted: number;
  errors: number;
}

export interface TopAlert {
  fields: ParsedTechnicalFields;
  start: number;
  reason: string;
  link?: string;
  active: boolean;
}

const Divider = euiStyled.div`
  border-right: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  height: 100%;
`;

const NO_INDEX_NAMES: string[] = [];
const NO_INDEX_PATTERNS: IndexPatternBase[] = [];

function AlertsPage() {
  const { core, plugins, ObservabilityPageTemplate } = usePluginContext();
  const { prepend } = core.http.basePath;
  const refetch = useRef<() => void>();
  const timefilterService = useTimefilterService();
  const {
    rangeFrom,
    setRangeFrom,
    rangeTo,
    setRangeTo,
    kuery,
    setKuery,
    workflowStatus,
    setWorkflowStatus,
  } = useAlertsPageStateContainer();
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [alertStatsLoading, setAlertStatsLoading] = useState<boolean>(false);
  const [alertStats, setAlertStats] = useState<AlertStatsState>({
    isLoading: false,
    ruleCount: -1,
    disabled: -1,
    muted: -1,
    errors: -1,
  });

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
    },
  ]);

  async function loadAlertStats() {
    setAlertStatsLoading(true);
    try {
      const alertsResponse = await loadAlertAggregations({
        http,
        page: { index: 0, size: 9999 },
        searchText: undefined,
        typesFilter: [],
        actionTypesFilter: [],
        alertStatusesFilter: [],
        sort: undefined,
      });
      const status = alertsResponse?.alertExecutionStatus;
      if (status) {
        setAlertStats({
          ...alertStats,
          ruleCount: status.active,
          errors: status.error,
        });
        setAlertStatsLoading(false);
      }
    } catch (_e) {
      toasts.addDanger({
        title: i18n.translate('xpack.observability.alerts.stats.loadError', {
          defaultMessage: 'Unable to load rule stats',
        }),
      });
      setAlertStatsLoading(false);
    }
  }

  useEffect(() => {
    loadAlertStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // In a future milestone we'll have a page dedicated to rule management in
  // observability. For now link to the settings page.
  const manageRulesHref = prepend('/app/management/insightsAndAlerting/triggersActions/alerts');

  const { data: indexNames = NO_INDEX_NAMES } = useFetcher(({ signal }) => {
    return callObservabilityApi({
      signal,
      endpoint: 'GET /api/observability/rules/alerts/dynamic_index_pattern',
      params: {
        query: {
          namespace: 'default',
          registrationContexts: [
            'observability.apm',
            'observability.logs',
            'observability.metrics',
            'observability.uptime',
          ],
        },
      },
    });
  }, []);

  const dynamicIndexPatternsAsyncState = useAsync(async (): Promise<IndexPatternBase[]> => {
    if (indexNames.length === 0) {
      return [];
    }

    return [
      {
        id: 'dynamic-observability-alerts-table-index-pattern',
        title: indexNames.join(','),
        fields: await plugins.data.indexPatterns.getFieldsForWildcard({
          pattern: indexNames.join(','),
          allowNoIndex: true,
        }),
      },
    ];
  }, [indexNames]);

  const setWorkflowStatusFilter = useCallback(
    (value: AlertWorkflowStatus) => {
      setWorkflowStatus(value);
    },
    [setWorkflowStatus]
  );

  const onQueryChange = useCallback(
    ({ dateRange, query }) => {
      if (rangeFrom === dateRange.from && rangeTo === dateRange.to && kuery === (query ?? '')) {
        return refetch.current && refetch.current();
      }

      timefilterService.setTime(dateRange);
      setRangeFrom(dateRange.from);
      setRangeTo(dateRange.to);
      setKuery(query);
    },
    [rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery, timefilterService]
  );

  const addToQuery = useCallback(
    (value: string) => {
      let output = value;
      if (kuery !== '') {
        output = `${kuery} and ${value}`;
      }
      onQueryChange({
        dateRange: { from: rangeFrom, to: rangeTo },
        query: output,
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

  if (!hasAnyData && !isAllRequestsComplete) {
    return <LoadingObservability />;
  }

  const noDataConfig = getNoDataConfig({
    hasData,
    basePath: core.http.basePath,
    docsLink: core.docLinks.links.observability.guide,
  });

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      data-test-subj={noDataConfig ? 'noDataPage' : undefined}
      pageHeader={{
        pageTitle: (
          <>
            {i18n.translate('xpack.observability.alertsTitle', { defaultMessage: 'Alerts' })}{' '}
            <ExperimentalBadge />
          </>
        ),
        rightSideItems: [
          <EuiStat
            title={alertStats.ruleCount}
            description={i18n.translate('xpack.observability.alerts.stats.ruleCount', {
              defaultMessage: 'Rule count',
            })}
            color="primary"
            titleSize="xs"
            isLoading={alertStatsLoading}
            data-test-subj="statRuleCount"
          />,
          <EuiStat
            title={alertStats.disabled}
            description={i18n.translate('xpack.observability.alerts.stats.disabled', {
              defaultMessage: 'Disabled',
            })}
            color="primary"
            titleSize="xs"
            isLoading={alertStatsLoading}
            data-test-subj="statDisabled"
          />,
          <EuiStat
            title={alertStats.muted}
            description={i18n.translate('xpack.observability.alerts.stats.muted', {
              defaultMessage: 'Muted',
            })}
            color="primary"
            titleSize="xs"
            isLoading={alertStatsLoading}
            data-test-subj="statMuted"
          />,
          <EuiStat
            title={alertStats.errors}
            description={i18n.translate('xpack.observability.alerts.stats.errors', {
              defaultMessage: 'Errors',
            })}
            color="primary"
            titleSize="xs"
            isLoading={alertStatsLoading}
            data-test-subj="statErrors"
          />,
          <Divider />,
          <EuiButtonEmpty href={manageRulesHref}>
            {i18n.translate('xpack.observability.alerts.manageRulesButtonLabel', {
              defaultMessage: 'Manage Rules',
            })}
          </EuiButtonEmpty>,
        ].reverse(),
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <AlertsDisclaimer />
        </EuiFlexItem>
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
              <WorkflowStatusFilter status={workflowStatus} onChange={setWorkflowStatusFilter} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <AlertsTableTGrid
            indexNames={indexNames}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            kuery={kuery}
            workflowStatus={workflowStatus}
            setRefetch={setRefetch}
            addToQuery={addToQuery}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}

function WrappedAlertsPage() {
  return (
    <Provider value={alertsPageStateContainer}>
      <AlertsPage />
    </Provider>
  );
}

export { WrappedAlertsPage as AlertsPage };
