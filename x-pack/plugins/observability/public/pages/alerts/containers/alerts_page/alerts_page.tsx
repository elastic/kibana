/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';

import { DataViewBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { ALERT_STATUS, AlertStatus } from '@kbn/rule-data-utils';

import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { loadAlertAggregations as loadRuleAggregations } from '../../../../../../../plugins/triggers_actions_ui/public';
import { AlertStatusFilterButton } from '../../../../../common/typings';
import { ParsedTechnicalFields } from '../../../../../../rule_registry/common/parse_technical_fields';
import { ParsedExperimentalFields } from '../../../../../../rule_registry/common/parse_experimental_fields';
import { ExperimentalBadge } from '../../../../components/shared/experimental_badge';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useHasData } from '../../../../hooks/use_has_data';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useTimefilterService } from '../../../../hooks/use_timefilter_service';
import { callObservabilityApi } from '../../../../services/call_observability_api';
import { getNoDataConfig } from '../../../../utils/no_data_config';
import { LoadingObservability } from '../../../overview/loading_observability';
import { AlertsTableTGrid } from '../alerts_table_t_grid';
import {
  Provider,
  alertsPageStateContainer,
  useAlertsPageStateContainer,
} from '../state_container';
import './styles.scss';
import { AlertsStatusFilter, AlertsDisclaimer, AlertsSearchBar } from '../../components';

interface RuleStatsState {
  total: number;
  disabled: number;
  muted: number;
  error: number;
}
export interface TopAlert {
  fields: ParsedTechnicalFields & ParsedExperimentalFields;
  start: number;
  reason: string;
  link?: string;
  active: boolean;
}

const Divider = euiStyled.div`
  border-right: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  height: 100%;
`;

const regExpEscape = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
const NO_INDEX_NAMES: string[] = [];
const NO_INDEX_PATTERNS: DataViewBase[] = [];
const BASE_ALERT_REGEX = new RegExp(`\\s*${regExpEscape(ALERT_STATUS)}\\s*:\\s*"(.*?|\\*?)"`);
const ALERT_STATUS_REGEX = new RegExp(
  `\\s*and\\s*${regExpEscape(ALERT_STATUS)}\\s*:\\s*(".+?"|\\*?)|${regExpEscape(
    ALERT_STATUS
  )}\\s*:\\s*(".+?"|\\*?)`,
  'gm'
);

function AlertsPage() {
  const { core, plugins, ObservabilityPageTemplate } = usePluginContext();
  const [alertFilterStatus, setAlertFilterStatus] = useState('' as AlertStatusFilterButton);
  const { prepend } = core.http.basePath;
  const refetch = useRef<() => void>();
  const timefilterService = useTimefilterService();
  const { rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery } =
    useAlertsPageStateContainer();
  const {
    http,
    notifications: { toasts },
  } = core;
  const [ruleStatsLoading, setRuleStatsLoading] = useState<boolean>(false);
  const [ruleStats, setRuleStats] = useState<RuleStatsState>({
    total: 0,
    disabled: 0,
    muted: 0,
    error: 0,
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
      });
      // Note that the API uses the semantics of 'alerts' instead of 'rules'
      const { alertExecutionStatus, ruleMutedStatus, ruleEnabledStatus } = response;
      if (alertExecutionStatus && ruleMutedStatus && ruleEnabledStatus) {
        const total = Object.values(alertExecutionStatus).reduce((acc, value) => acc + value, 0);
        const { disabled } = ruleEnabledStatus;
        const { muted } = ruleMutedStatus;
        const { error } = alertExecutionStatus;
        setRuleStats({
          ...ruleStats,
          total,
          disabled,
          muted,
          error,
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

  // In a future milestone we'll have a page dedicated to rule management in
  // observability. For now link to the settings page.
  const manageRulesHref = prepend('/app/management/insightsAndAlerting/triggersActions/alerts');

  const { data: indexNames = NO_INDEX_NAMES } = useFetcher(({ signal }) => {
    return callObservabilityApi('GET /api/observability/rules/alerts/dynamic_index_pattern', {
      signal,
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

  const dynamicIndexPatternsAsyncState = useAsync(async (): Promise<DataViewBase[]> => {
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
            title={ruleStats.total}
            description={i18n.translate('xpack.observability.alerts.ruleStats.ruleCount', {
              defaultMessage: 'Rule count',
            })}
            color="primary"
            titleSize="xs"
            isLoading={ruleStatsLoading}
            data-test-subj="statRuleCount"
          />,
          <EuiStat
            title={ruleStats.disabled}
            description={i18n.translate('xpack.observability.alerts.ruleStats.disabled', {
              defaultMessage: 'Disabled',
            })}
            color="primary"
            titleSize="xs"
            isLoading={ruleStatsLoading}
            data-test-subj="statDisabled"
          />,
          <EuiStat
            title={ruleStats.muted}
            description={i18n.translate('xpack.observability.alerts.ruleStats.muted', {
              defaultMessage: 'Muted',
            })}
            color="primary"
            titleSize="xs"
            isLoading={ruleStatsLoading}
            data-test-subj="statMuted"
          />,
          <EuiStat
            title={ruleStats.error}
            description={i18n.translate('xpack.observability.alerts.ruleStats.errors', {
              defaultMessage: 'Errors',
            })}
            color="primary"
            titleSize="xs"
            isLoading={ruleStatsLoading}
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
              <AlertsStatusFilter status={alertFilterStatus} onChange={setAlertStatusFilter} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <AlertsTableTGrid
            indexNames={indexNames}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            kuery={kuery}
            setRefetch={setRefetch}
          />
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
