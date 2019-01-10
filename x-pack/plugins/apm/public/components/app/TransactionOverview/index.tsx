/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { withRouter } from 'react-router-dom';
import { TransactionCharts } from 'x-pack/plugins/apm/public/components/shared/charts/TransactionCharts';
import { TransactionListRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/transactionList';
import { TransactionOverviewChartsRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/transactionOverviewCharts';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { legacyEncodeURIComponent } from 'x-pack/plugins/apm/public/utils/url';
// @ts-ignore
import List from './List';

interface TransactionOverviewProps {
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
  // TODO: find better react-router-dom withRouter prop type handling?
  history: any;
  location: any;
  match: any;
}

export class TransactionOverviewView extends React.Component<
  TransactionOverviewProps
> {
  public handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { urlParams, history, location } = this.props;
    const type = legacyEncodeURIComponent(event.target.value);
    history.push({
      ...location,
      pathname: `/${urlParams.serviceName}/transactions/${type}`
    });
  };

  public render() {
    const { urlParams, serviceTransactionTypes, location } = this.props;
    const { serviceName, transactionType } = urlParams;

    // filtering by type is currently required
    if (!serviceName || !transactionType) {
      return null;
    }

    return (
      <React.Fragment>
        {serviceTransactionTypes.length > 1 ? (
          <EuiFormRow label="Filter by type">
            <EuiSelect
              options={serviceTransactionTypes.map(type => ({
                text: `${type}`,
                value: type
              }))}
              value={transactionType}
              onChange={this.handleTypeChange}
            />
          </EuiFormRow>
        ) : null}

        <TransactionOverviewChartsRequest
          urlParams={urlParams}
          render={({ data }) => (
            <TransactionCharts
              charts={data}
              location={location}
              urlParams={urlParams}
            />
          )}
        />

        <EuiSpacer size="l" />

        <TransactionListRequest
          urlParams={urlParams}
          render={({ data }) => <List items={data} serviceName={serviceName} />}
        />
      </React.Fragment>
    );
  }
}

export const TransactionOverview = withRouter<TransactionOverviewProps>(
  TransactionOverviewView
);
