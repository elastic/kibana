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
  serviceName: string;
  location: any;
}

export class Tabs extends React.PureComponent<TabsProps> {
  public render() {
    const { transactionTypes, urlParams, serviceName, location } = this.props;
    const tabs = [
      {
        name: 'Transactions',
        path: `/${serviceName}/transactions`,
        component: () => (
          <TransactionOverview
            urlParams={urlParams}
            serviceName={serviceName}
            agentName="whatever"
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
        component: () => (
          <ServiceMetrics serviceName={serviceName} urlParams={urlParams} />
        )
      }
    ];

    return <HistoryTabs tabs={tabs} />;
  }
}
