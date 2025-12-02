/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import type { ObservabilityPublicPluginsStart } from '@kbn/observability-plugin/public';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';

type ChartType = 'latency' | 'throughput' | 'failedTransactionRate';

interface OpenInDiscoverButtonProps {
  serviceName: string;
  environment: string;
  transactionType: string;
  transactionName?: string;
  start: string;
  end: string;
  chartType: ChartType;
  kuery?: string;
}

const getESQLQueryForChart = ({
  chartType,
  indexSettings,
  serviceName,
  environment,
  transactionType,
  transactionName,
  kuery,
}: {
  chartType: ChartType;
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
  serviceName: string;
  environment: string;
  transactionType: string;
  transactionName?: string;
  kuery?: string;
}) => {
  if (!indexSettings || indexSettings.length === 0) {
    return null;
  }

  // Get transaction index
  const transactionIndex = indexSettings.find(
    (setting) => setting.configurationName === 'transaction'
  );
  const index = transactionIndex?.savedValue ?? transactionIndex?.defaultValue;

  if (!index) return null;

  // Build base filters
  const filters: string[] = [];

  filters.push(`${SERVICE_NAME} == "${serviceName}"`);
  filters.push(`${TRANSACTION_TYPE} == "${transactionType}"`);

  if (
    environment &&
    environment !== ENVIRONMENT_ALL_VALUE &&
    environment !== ENVIRONMENT_NOT_DEFINED_VALUE
  ) {
    filters.push(`${SERVICE_ENVIRONMENT} == "${environment}"`);
  }

  if (transactionName) {
    filters.push(`${TRANSACTION_NAME} == "${transactionName}"`);
  }

  // Add kuery filter using KQL() function
  if (kuery && kuery.trim()) {
    // Escape quotes and normalize whitespace for KQL embedding
    const escapedKuery = kuery
      .trim()
      .replace(/"/g, '\\"')
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ');
    filters.push(`KQL("${escapedKuery}")`);
  }

  // Chart-specific query construction
  const whereClause = filters.join(' AND ');

  switch (chartType) {
    case 'latency':
      // For latency: show slowest transactions first
      return [
        `FROM ${index}`,
        `| WHERE ${whereClause}`,
        `| KEEP @timestamp,`,
        `       service.name,`,
        `       transaction.name,`,
        `       transaction.type,`,
        `       transaction.duration.us,`,
        `       trace.id,`,
        `       transaction.id,`,
        `       service.environment`,
        `| SORT transaction.duration.us DESC`,
        `| LIMIT 100`,
      ].join('\n');

    case 'throughput':
      // For throughput: show recent transactions for context
      return [
        `FROM ${index}`,
        `| WHERE ${whereClause}`,
        `| KEEP @timestamp,`,
        `       service.name,`,
        `       transaction.name,`,
        `       transaction.type,`,
        `       trace.id,`,
        `       transaction.id,`,
        `       service.environment`,
        `| SORT @timestamp DESC`,
        `| LIMIT 500`,
      ].join('\n');

    case 'failedTransactionRate':
      // For failed transaction rate: show ONLY failed transactions
      return [
        `FROM ${index}`,
        `| WHERE ${whereClause}`,
        `  AND event.outcome == "failure"`,
        `| KEEP @timestamp,`,
        `       service.name,`,
        `       transaction.name,`,
        `       transaction.type,`,
        `       event.outcome,`,
        `       trace.id,`,
        `       transaction.id,`,
        `       error.exception.message,`,
        `       error.exception.type,`,
        `       service.environment`,
        `| SORT @timestamp DESC`,
        `| LIMIT 100`,
      ].join('\n');

    default:
      return null;
  }
};

export function OpenInDiscoverButton({
  serviceName,
  environment,
  transactionType,
  transactionName,
  start,
  end,
  chartType,
  kuery,
}: OpenInDiscoverButtonProps) {
  const { services } = useKibana<ObservabilityPublicPluginsStart>();
  const { share, apmSourcesAccess } = services;

  // Fetch APM index settings
  const { data: indexSettingsData, status: indexSettingsStatus } = useFetcher(
    async (_, signal) => {
      if (!apmSourcesAccess) return { apmIndexSettings: [] };
      return apmSourcesAccess.getApmIndexSettings({ signal });
    },
    [apmSourcesAccess]
  );

  const indexSettings = indexSettingsData?.apmIndexSettings ?? [];

  const esqlQuery = getESQLQueryForChart({
    chartType,
    indexSettings,
    serviceName,
    environment,
    transactionType,
    transactionName,
    kuery,
  });

  const discoverHref = share?.url?.locators?.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    timeRange: {
      from: start,
      to: end,
    },
    query: {
      esql: esqlQuery,
    },
  });

  const labels = {
    latency: i18n.translate('xpack.apm.alertDetails.latencyChart.openInDiscover', {
      defaultMessage: 'Open in Discover',
    }),
    throughput: i18n.translate('xpack.apm.alertDetails.throughputChart.openInDiscover', {
      defaultMessage: 'Open in Discover',
    }),
    failedTransactionRate: i18n.translate(
      'xpack.apm.alertDetails.failedTransactionRate.openInDiscover',
      {
        defaultMessage: 'Open in Discover',
      }
    ),
  };

  return (
    <EuiButtonEmpty
      data-test-subj={`alertDetails-${chartType}-openInDiscover`}
      iconType="discoverApp"
      href={discoverHref}
      isDisabled={!esqlQuery || indexSettingsStatus !== FETCH_STATUS.SUCCESS}
      isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
    >
      {labels[chartType]}
    </EuiButtonEmpty>
  );
}
