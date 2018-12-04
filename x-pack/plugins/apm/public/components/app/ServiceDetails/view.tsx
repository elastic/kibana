/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { HistoryTabs } from 'x-pack/plugins/apm/public/components/shared/HistoryTabs';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
import { HeaderContainer } from '../../shared/UIComponents';
import { ErrorGroupOverview } from '../ErrorGroupOverview/beta';
import { TransactionOverview } from '../TransactionOverview/beta';
import { ServiceIntegrations } from './ServiceIntegrations';
import { ServiceMetrics } from './ServiceMetrics';

const TabContentWrapper: React.SFC = ({ children }) => {
  return (
    <React.Fragment>
      <EuiSpacer />
      {children}
    </React.Fragment>
  );
};

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
        <HeaderContainer>
          <h1>{serviceName}</h1>
          <ServiceIntegrations />
        </HeaderContainer>

        <KueryBar />

        <HistoryTabs tabs={tabs} contentWrapper={TabContentWrapper} />
      </div>
    );
  }
}
