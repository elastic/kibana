/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { ServiceDetailsRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/serviceDetails';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { legacyEncodeURIComponent } from 'x-pack/plugins/apm/public/utils/url';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
import { ServiceDetailTabs } from './ServiceDetailTabs';
import { ServiceIntegrations } from './ServiceIntegrations';

interface ServiceDetailsProps {
  urlParams: IUrlParams;
  location: any;
  match: {
    path: string;
  };
}

export class ServiceDetailsView extends React.Component<ServiceDetailsProps> {
  public render() {
    const { urlParams, location, match } = this.props;
    return (
      <ServiceDetailsRequest
        urlParams={urlParams}
        render={({ data }) => {
          const { serviceName, transactionType } = urlParams;
          // redirect /service/transactions -> /service/transactions/type
          if (match.path === '/:serviceName/transactions' && transactionType) {
            return (
              <Redirect
                to={{
                  ...location,
                  pathname: `/${serviceName}/transactions/${legacyEncodeURIComponent(
                    transactionType
                  )}`
                }}
              />
            );
          }
          return (
            <React.Fragment>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiTitle size="l">
                    <h1>{urlParams.serviceName}</h1>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ServiceIntegrations
                    location={this.props.location}
                    urlParams={urlParams}
                    serviceTransactionTypes={data.types}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer />

              <KueryBar />

              <ServiceDetailTabs
                location={location}
                urlParams={urlParams}
                transactionTypes={data.types}
              />
            </React.Fragment>
          );
        }}
      />
    );
  }
}
