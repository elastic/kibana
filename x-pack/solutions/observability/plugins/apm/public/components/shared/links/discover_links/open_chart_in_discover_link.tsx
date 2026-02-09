/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useEnvironmentsContext } from '../../../../context/environments_context/use_environments_context';
import { BaseDiscoverLink } from './base_discover_link';
import { getESQLQuery } from './get_esql_query';

export function OpenChartInDiscoverLink({ dataTestSubj }: { dataTestSubj: string }) {
  const { serviceName, transactionType, indexSettings } = useApmServiceContext();
  const { environment } = useEnvironmentsContext();

  const { query: queryParams } = useAnyOfApmParams(
    '/services/{serviceName}/overview',
    '/services/{serviceName}/transactions',
    '/services/{serviceName}/transactions/view',
    '/services/{serviceName}/errors',
    '/mobile-services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/transactions/view'
  );

  const { rangeFrom, rangeTo, kuery } = queryParams;

  const transactionName =
    'transactionName' in queryParams ? queryParams.transactionName : undefined;

  const esqlQuery = getESQLQuery({
    indexType: 'traces',
    params: {
      kuery,
      serviceName,
      environment,
      transactionName,
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
