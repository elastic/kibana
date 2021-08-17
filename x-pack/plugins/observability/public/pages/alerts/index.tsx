/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import type {
  ALERT_STATUS as ALERT_STATUS_TYPED,
} from '@kbn/rule-data-utils';
import {
  ALERT_STATUS as ALERT_STATUS_NON_TYPED,
} from '@kbn/rule-data-utils/target_node/technical_field_names';
import { ParsedTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import type { AlertStatus } from '../../../common/typings';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { RouteParams } from '../../routes';
import { AlertsSearchBar } from './alerts_search_bar';
import { AlertsTableTGrid } from './alerts_table_t_grid';
import { StatusFilter } from './status_filter';
import { useFetcher } from '../../hooks/use_fetcher';
import { callObservabilityApi } from '../../services/call_observability_api';
import './styles.scss';

const ALERT_STATUS: typeof ALERT_STATUS_TYPED = ALERT_STATUS_NON_TYPED;

export interface TopAlert {
  fields: ParsedTechnicalFields;
  start: number;
  reason: string;
  link?: string;
  active: boolean;
}

interface AlertsPageProps {
  routeParams: RouteParams<'/alerts'>;
}

export function AlertsPage({ routeParams }: AlertsPageProps) {
  const { core, ObservabilityPageTemplate } = usePluginContext();
  const { prepend } = core.http.basePath;
  const history = useHistory();
  const refetch = useRef<() => void>();
  const {
    query: { rangeFrom = 'now-15m', rangeTo = 'now', kuery = '', status = 'open' },
  } = routeParams;

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

  const { data: dynamicIndexPatternResp, status: fetcherStatus } = useFetcher(({ signal }) => {
    return callObservabilityApi({
      signal,
      endpoint: 'GET /api/observability/rules/alerts/dynamic_index_pattern',
    });
  }, []);

  const dynamicIndexPattern = useMemo(
    () => (dynamicIndexPatternResp ? [dynamicIndexPatternResp] : []),
    [dynamicIndexPatternResp]
  );

  const setStatusFilter = useCallback(
    (value: AlertStatus) => {
      const nextSearchParams = new URLSearchParams(history.location.search);
      nextSearchParams.set('status', value);
      history.push({
        ...history.location,
        search: nextSearchParams.toString(),
      });
    },
    [history]
  );

  const onQueryChange = useCallback(
    ({ dateRange, query }) => {
      if (rangeFrom === dateRange.from && rangeTo === dateRange.to && kuery === (query ?? '')) {
        return refetch.current && refetch.current();
      }
      const nextSearchParams = new URLSearchParams(history.location.search);

      nextSearchParams.set('rangeFrom', dateRange.from);
      nextSearchParams.set('rangeTo', dateRange.to);
      nextSearchParams.set('kuery', query ?? '');

      history.push({
        ...history.location,
        search: nextSearchParams.toString(),
      });
    },
    [history, rangeFrom, rangeTo, kuery]
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

  useEffect(() => {
    if (fetcherStatus === 'success') {
      const nextSearchParams = new URLSearchParams(history.location.search);

      nextSearchParams.set('kuery', `${ALERT_STATUS}: "open"`); // TODO this needs to be changed, this should be part of another dependent PR that updates the Status column values to Active and recovered
      history.push({
        ...history.location,
        search: nextSearchParams.toString(),
      });
    }
  }, [fetcherStatus, history]);

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
      <EuiFlexGroup direction="column">
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
                  'This page shows an experimental alerting view. The data shown here will probably not be an accurate representation of alerts. A non-experimental list of alerts is available in the Alerts and Actions settings in Stack Management.',
              })}
            </p>
            <p>
              <EuiLink href={prepend('/app/management/insightsAndAlerting/triggersActions/alerts')}>
                {i18n.translate('xpack.observability.alertsDisclaimerLinkText', {
                  defaultMessage: 'Alerts and Actions',
                })}
              </EuiLink>
            </p>
          </EuiCallOut>
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertsSearchBar
            dynamicIndexPattern={dynamicIndexPattern}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            query={kuery}
            onQueryChange={onQueryChange}
            addToQuery={addToQuery}
          />
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <StatusFilter status={status} onChange={setStatusFilter} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertsTableTGrid
              indexName={dynamicIndexPattern.length > 0 ? dynamicIndexPattern[0].title : ''}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              kuery={kuery}
              status={status}
              setRefetch={setRefetch}
              addToQuery={addToQuery}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
