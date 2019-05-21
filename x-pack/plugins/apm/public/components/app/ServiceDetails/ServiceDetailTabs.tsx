/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { IUrlParams } from '../../../context/UrlParamsContext/types';
import { HistoryTabs } from '../../shared/HistoryTabs';
import { ErrorGroupOverview } from '../ErrorGroupOverview';
import { TransactionOverview } from '../TransactionOverview';
import { ServiceMetrics } from './ServiceMetrics';
import { useLocation } from '../../../hooks/useLocation';

interface Props {
  transactionTypes: string[];
  urlParams: IUrlParams;
  isRumAgent?: boolean;
  agentName: string;
}

export function ServiceDetailTabs({
  transactionTypes,
  urlParams,
  isRumAgent,
  agentName
}: Props) {
  const location = useLocation();
  const { serviceName } = urlParams;
  const headTransactionType = transactionTypes[0];
  const transactionsTab = {
    name: i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
      defaultMessage: 'Transactions'
    }),
    path: headTransactionType
      ? `/${serviceName}/transactions/${headTransactionType}`
      : `/${serviceName}/transactions`,
    routePath: `/${serviceName}/transactions/:transactionType?`,
    render: () => (
      <TransactionOverview
        urlParams={urlParams}
        serviceTransactionTypes={transactionTypes}
      />
    )
  };
  const errorsTab = {
    name: i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
      defaultMessage: 'Errors'
    }),
    path: `/${serviceName}/errors`,
    render: () => {
      return <ErrorGroupOverview urlParams={urlParams} location={location} />;
    }
  };
  const metricsTab = {
    name: i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
      defaultMessage: 'Metrics'
    }),
    path: `/${serviceName}/metrics`,
    render: () => <ServiceMetrics urlParams={urlParams} agentName={agentName} />
  };
  const tabs = isRumAgent
    ? [transactionsTab, errorsTab]
    : [transactionsTab, errorsTab, metricsTab];

  return <HistoryTabs tabs={tabs} />;
}
