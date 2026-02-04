/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { from } from '@kbn/esql-composer';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useEnvironmentsContext } from '../../../../context/environments_context/use_environments_context';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';
import { BaseDiscoverLink } from './base_discover_link';
import {
  filterByEnvironment,
  filterByKuery,
  filterByServiceName,
  filterByTransactionType,
  filterByTransactionNameOrSpanName,
} from './filters';

const getESQLQuery = ({
  params,
  indexSettings,
}: {
  params: {
    serviceName?: string;
    kuery?: string;
    environment?: string;
    transactionName?: string;
    transactionType?: string;
  };
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}) => {
  if (!indexSettings || indexSettings?.length === 0) {
    return null;
  }

  const { serviceName, kuery, environment, transactionType, transactionName } = params;

  const tracesIndices = indexSettings
    .filter((indexSetting) => ['span', 'transaction'].includes(indexSetting.configurationName))
    .map((indexSetting) => indexSetting.savedValue ?? indexSetting.defaultValue);
  const dedupedIndices = Array.from(new Set(tracesIndices)).join(',');

  const filters = [];

  if (serviceName) {
    filters.push(filterByServiceName(serviceName));
  }

  if (
    environment &&
    environment !== ENVIRONMENT_ALL_VALUE &&
    environment !== ENVIRONMENT_NOT_DEFINED_VALUE
  ) {
    filters.push(filterByEnvironment(environment));
  }

  if (transactionName) {
    filters.push(filterByTransactionNameOrSpanName(transactionName, undefined));
  }

  if (transactionType) {
    filters.push(filterByTransactionType(transactionType));
  }

  if (kuery) {
    filters.push(filterByKuery(kuery));
  }

  return from(dedupedIndices)
    .pipe(...filters)
    .toString();
};

export function OpenChartInDiscoverLink({ dataTestSubj }: { dataTestSubj: string }) {
  const { serviceName, transactionType, indexSettings } = useApmServiceContext();
  const { environment } = useEnvironmentsContext();

  const { query: queryParams } = useAnyOfApmParams(
    '/services/{serviceName}/overview',
    '/services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions'
  );

  const { rangeFrom, rangeTo, kuery } = queryParams;

  const esqlQuery = getESQLQuery({
    params: {
      serviceName,
      kuery,
      environment,
      transactionType,
    },
    indexSettings,
  });

  return (
    <BaseDiscoverLink
      dataTestSubj={dataTestSubj}
      esqlQuery={esqlQuery}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
    >
      {i18n.translate('xpack.apm.serviceOverview.openInDiscoverLink.label', {
        defaultMessage: 'Open in Discover',
      })}
    </BaseDiscoverLink>
  );
}
