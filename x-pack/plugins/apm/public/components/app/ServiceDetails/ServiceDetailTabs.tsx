/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HistoryTabs } from 'x-pack/plugins/apm/public/components/shared/HistoryTabs';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ErrorGroupOverview } from '../ErrorGroupOverview';
import { TransactionOverview } from '../TransactionOverview';
import { ServiceMetrics } from './ServiceMetrics';

interface TabsProps {
  transactionTypes: string[];
  urlParams: IUrlParams;
  location: any;
}

export class ServiceDetailTabs extends React.Component<TabsProps> {
  public render() {
    const { transactionTypes, urlParams, location } = this.props;
    const { serviceName } = urlParams;
    const tabs = [
      {
        name: 'Transactions',
        path: `/${serviceName}/transactions/${transactionTypes[0]}`,
        routePath: `/${serviceName}/transactions/:transactionType?`,
        component: () => (
          <TransactionOverview
            urlParams={urlParams}
            serviceTransactionTypes={transactionTypes}
          />
        )
      },
      {
        name: 'Errors',
        path: `/${serviceName}/errors`,
        component: () => {
          return (
            <ErrorGroupOverview urlParams={urlParams} location={location} />
          );
        }
      },
      {
        name: 'Metrics',
        path: `/${serviceName}/metrics`,
        component: () => <ServiceMetrics urlParams={urlParams} />
      }
    ];

    return <HistoryTabs tabs={tabs} />;
  }
}
