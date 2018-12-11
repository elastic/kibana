/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { HistoryTabs } from 'x-pack/plugins/apm/public/components/shared/HistoryTabs';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
import { ErrorGroupOverview } from '../ErrorGroupOverview';
import { TransactionOverview } from '../TransactionOverview';
import { ServiceIntegrations } from './ServiceIntegrations';
import { ServiceMetrics } from './ServiceMetrics';

interface ServiceDetailsProps {
  urlParams: IUrlParams;
  match: {
    params: StringMap;
  };
  location: any;
}

export class ServiceDetailsView extends React.Component<ServiceDetailsProps> {
  public render() {
    const { urlParams, match, location } = this.props;
    const { serviceName } = match.params;
    const tabs = [
      {
        name: 'Transactions',
        path: `/${serviceName}/transactions`,
        component: () => (
          <TransactionOverview
            urlParams={urlParams}
            serviceName={serviceName}
            agentName="whatever"
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

    return (
      <div>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1>{serviceName}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ServiceIntegrations
              location={this.props.location}
              serviceName={serviceName}
              transactionType={urlParams.transactionType}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <KueryBar />

        <HistoryTabs tabs={tabs} />
      </div>
    );
  }
}
