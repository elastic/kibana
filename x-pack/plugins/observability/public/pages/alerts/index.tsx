/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { IndexPatternBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useRef } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { ParsedTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import type { AlertWorkflowStatus } from '../../../common/typings';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetcher } from '../../hooks/use_fetcher';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimefilterService } from '../../hooks/use_timefilter_service';
import { callObservabilityApi } from '../../services/call_observability_api';
import { AlertsSearchBar } from './alerts_search_bar';
import { AlertsTableTGrid } from './alerts_table_t_grid';
import { Provider, alertsPageStateContainer, useAlertsPageStateContainer } from './state_container';
import './styles.scss';
import { WorkflowStatusFilter } from './workflow_status_filter';

export interface TopAlert {
  fields: ParsedTechnicalFields;
  start: number;
  reason: string;
  link?: string;
  active: boolean;
}

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

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
    },
  ]);

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

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: (
          <>
            {i18n.translate('xpack.observability.alertsTitle', { defaultMessage: 'Alerts' })}{' '}
            <ExperimentalBadge />
          </>
        ),
        rightSideItems: [
          <EuiButtonEmpty href={manageRulesHref}>
            {i18n.translate('xpack.observability.alerts.manageRulesButtonLabel', {
              defaultMessage: 'Manage Rules',
            })}
          </EuiButtonEmpty>,
        ],
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiCallOut
            title={i18n.translate('xpack.observability.alertsDisclaimerTitle', {
              defaultMessage: 'Experimental',
            })}
            color="warning"
            iconType="beaker"
          >
            <p>
              {i18n.translate('xpack.observability.alertsDisclaimerText', {
                defaultMessage:
                  'This page shows an experimental list of alerts. The data might not be accurate. All alerts are available in the ',
              })}
              <EuiLink href={prepend('/app/management/insightsAndAlerting/triggersActions/alerts')}>
                {i18n.translate('xpack.observability.alertsDisclaimerLinkText', {
                  defaultMessage: 'Rules and Connectors settings.',
                })}
              </EuiLink>
            </p>
          </EuiCallOut>
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
