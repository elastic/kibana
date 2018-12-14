/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { ServiceDetailsRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/serviceDetails';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
import { Tabs } from './ServiceDetailTabs';
import { ServiceIntegrations } from './ServiceIntegrations';

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

    const params = { ...urlParams, serviceName };

    return (
      <ServiceDetailsRequest
        urlParams={params}
        render={({ data }) =>
          // don't want to let stale data cause UI flashes, so
          // we wait until the request has returned before rendering
          data.serviceName !== serviceName ? null : (
            <React.Fragment>
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
                    // TODO fix url params : transaction type to read from qs too
                    transactionType={params.transactionType}
                    serviceTransactionTypes={data.types}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer />

              <KueryBar />

              <Tabs
                serviceName={serviceName}
                location={location}
                urlParams={params}
                transactionTypes={data.types}
              />
            </React.Fragment>
          )
        }
      />
    );
  }
}
