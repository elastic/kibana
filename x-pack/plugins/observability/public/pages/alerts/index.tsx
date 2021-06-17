/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { ParsedTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import type { AlertStatus } from '../../../common/typings';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { useFetcher } from '../../hooks/use_fetcher';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { RouteParams } from '../../routes';
import { callObservabilityApi } from '../../services/call_observability_api';
import type { ObservabilityAPIReturnType } from '../../services/call_observability_api/types';
import { getAbsoluteDateRange } from '../../utils/date';
import { AlertsSearchBar } from './alerts_search_bar';
import { AlertsTable } from './alerts_table';
import { StatusFilter } from './status_filter';

export type TopAlertResponse = ObservabilityAPIReturnType<'GET /api/observability/rules/alerts/top'>[number];

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
  const {
    query: { rangeFrom = 'now-15m', rangeTo = 'now', kuery = '', status = 'open' },
  } = routeParams;

  // In a future milestone we'll have a page dedicated to rule management in
  // observability. For now link to the settings page.
  const manageDetectionRulesHref = prepend(
    '/app/management/insightsAndAlerting/triggersActions/alerts'
  );

  const { data: alerts } = useFetcher(
    ({ signal }) => {
      const { start, end } = getAbsoluteDateRange({ rangeFrom, rangeTo });

      if (!start || !end) {
        return;
      }
      return callObservabilityApi({
        signal,
        endpoint: 'GET /api/observability/rules/alerts/top',
        params: {
          query: {
            start,
            end,
            kuery,
            status,
          },
        },
      });
    },
    [kuery, rangeFrom, rangeTo, status]
  );

  function setStatusFilter(value: AlertStatus) {
    const nextSearchParams = new URLSearchParams(history.location.search);
    nextSearchParams.set('status', value);
    history.push({
      ...history.location,
      search: nextSearchParams.toString(),
    });
  }

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
          <EuiButton fill href={manageDetectionRulesHref} iconType="gear">
            {i18n.translate('xpack.observability.alerts.manageDetectionRulesButtonLabel', {
              defaultMessage: 'Manage detection rules',
            })}
          </EuiButton>,
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
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            query={kuery}
            onQueryChange={({ dateRange, query }) => {
              const nextSearchParams = new URLSearchParams(history.location.search);

              nextSearchParams.set('rangeFrom', dateRange.from);
              nextSearchParams.set('rangeTo', dateRange.to);
              nextSearchParams.set('kuery', query ?? '');

              history.push({
                ...history.location,
                search: nextSearchParams.toString(),
              });
            }}
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
            <AlertsTable items={alerts ?? []} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
