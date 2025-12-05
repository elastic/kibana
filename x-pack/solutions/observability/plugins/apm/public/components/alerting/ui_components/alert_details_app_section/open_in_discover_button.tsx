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
import { from, sort, keep, limit, SortOrder } from '@kbn/esql-composer';
import {
  TRANSACTION_DURATION,
  TRACE_ID,
  TRANSACTION_ID,
  EVENT_OUTCOME,
  AT_TIMESTAMP,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT,
} from '@kbn/apm-types';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import type { ObservabilityPublicPluginsStart } from '@kbn/observability-plugin/public';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';
import {
  filterByEnvironment,
  filterByKuery,
  filterByServiceName,
  filterByTransactionNameOrSpanName,
  filterByTransactionType,
} from '../../../../../common/utils/esql/filters';

export enum AlertChartType {
  LATENCY = 'latency',
  THROUGHPUT = 'throughput',
  FAILED_TRANSACTION_RATE = 'failedTransactionRate',
}

interface OpenInDiscoverButtonProps {
  chartType: AlertChartType;
  serviceName: string;
  environment: string;
  transactionType: string;
  transactionName?: string;
  rangeFrom: string;
  rangeTo: string;
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
  chartType: AlertChartType;
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

  const transactionIndex = indexSettings.find(
    (setting) => setting.configurationName === 'transaction'
  );

  const index = transactionIndex?.savedValue ?? transactionIndex?.defaultValue;

  if (!index) return null;

  const baseFilters = [];

  baseFilters.push(filterByServiceName(serviceName));
  baseFilters.push(filterByTransactionType(transactionType));

  if (
    environment &&
    environment !== ENVIRONMENT_ALL_VALUE &&
    environment !== ENVIRONMENT_NOT_DEFINED_VALUE
  ) {
    baseFilters.push(filterByEnvironment(environment));
  }

  if (transactionName) {
    baseFilters.push(filterByTransactionNameOrSpanName(transactionName, undefined));
  }

  if (kuery && kuery.trim()) {
    baseFilters.push(filterByKuery(kuery));
  }

  const commonFields = [
    AT_TIMESTAMP,
    SERVICE_NAME,
    TRANSACTION_NAME,
    TRANSACTION_TYPE,
    TRACE_ID,
    TRANSACTION_ID,
    SERVICE_ENVIRONMENT,
  ];

  switch (chartType) {
    case AlertChartType.LATENCY:
      return from(index)
        .pipe(
          ...baseFilters,
          keep(...commonFields, TRANSACTION_DURATION),
          sort({ [TRANSACTION_DURATION]: SortOrder.Desc }),
          limit(100)
        )
        .toString();

    case AlertChartType.THROUGHPUT:
      return from(index)
        .pipe(
          ...baseFilters,
          keep(...commonFields),
          sort({ [AT_TIMESTAMP]: SortOrder.Desc }),
          limit(500)
        )
        .toString();

    case AlertChartType.FAILED_TRANSACTION_RATE:
      return from(index)
        .pipe(
          ...baseFilters,
          keep(...commonFields, EVENT_OUTCOME),
          sort({ [AT_TIMESTAMP]: SortOrder.Desc }),
          limit(100)
        )
        .toString();

    default:
      return null;
  }
};

export function OpenInDiscoverButton({
  chartType,
  serviceName,
  environment,
  transactionType,
  transactionName,
  rangeFrom,
  rangeTo,
  kuery,
}: OpenInDiscoverButtonProps) {
  const { services } = useKibana<ObservabilityPublicPluginsStart>();
  const { share, apmSourcesAccess } = services;

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
      from: rangeFrom,
      to: rangeTo,
    },
    query: {
      esql: esqlQuery,
    },
  });

  return (
    <EuiButtonEmpty
      data-test-subj={`alertDetails-${chartType}-openInDiscover`}
      aria-label={i18n.translate('xpack.apm.alertDetails.openInDiscoverButton.ariaLabel', {
        defaultMessage: 'Open in Discover',
      })}
      iconType="discoverApp"
      href={discoverHref}
      isDisabled={!esqlQuery || indexSettingsStatus !== FETCH_STATUS.SUCCESS}
      isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
    >
      {i18n.translate('xpack.apm.alertDetails.openInDiscoverButton.label', {
        defaultMessage: 'Open in Discover',
      })}
    </EuiButtonEmpty>
  );
}
