/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
import { HistoryTabs } from 'x-pack/plugins/apm/public/components/shared/HistoryTabs';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ErrorGroupOverview } from '../ErrorGroupOverview';
import { TransactionOverview } from '../TransactionOverview';
import { ServiceMetrics } from './ServiceMetrics';

interface TabsProps {
  transactionTypes: string[];
  urlParams: IUrlParams;
  location: Location;
}

export class ServiceDetailTabs extends React.Component<TabsProps> {
  public render() {
    const { transactionTypes, urlParams, location } = this.props;
    const { serviceName } = urlParams;
    const tabs = [
      {
        name: i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
          defaultMessage: 'Transactions'
        }),
        path: `/${serviceName}/transactions/${transactionTypes[0]}`,
        routePath: `/${serviceName}/transactions/:transactionType?`,
        render: () => (
          <TransactionOverview
            urlParams={urlParams}
            serviceTransactionTypes={transactionTypes}
          />
        )
      },
      {
        name: i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
          defaultMessage: 'Errors'
        }),
        path: `/${serviceName}/errors`,
        render: () => {
          return (
            <ErrorGroupOverview urlParams={urlParams} location={location} />
          );
        }
      },
      {
        name: i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
          defaultMessage: 'Metrics'
        }),
        path: `/${serviceName}/metrics`,
        render: () => (
          <ServiceMetrics urlParams={urlParams} location={location} />
        )
      }
    ];

    return <HistoryTabs tabs={tabs} />;
  }
}
