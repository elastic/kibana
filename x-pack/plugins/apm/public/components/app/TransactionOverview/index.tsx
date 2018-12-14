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
import { fromQuery, toQuery } from 'x-pack/plugins/apm/public/utils/url';
// @ts-ignore
import List from './List';

interface TransactionOverviewProps {
  agentName: string;
  serviceName: string;
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
  public componentDidMount() {
    const { transactionType } = toQuery(this.props.location.search);
    if (!transactionType && this.props.serviceTransactionTypes.length > 0) {
      this.updateQueryString(this.props.serviceTransactionTypes[0]);
    }
  }

  public updateQueryString(type: string) {
    const { history, location } = this.props;
    history.push({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        transactionType: type
      })
    });
  }

  public handleTypeChange = (event: any) => {
    this.updateQueryString(event.target.value);
  };

  public render() {
    const {
      agentName,
      serviceName,
      urlParams,
      serviceTransactionTypes,
      location
    } = this.props;
    const { transactionType } = toQuery(location.search);

    // filtering by type is currently required
    if (!transactionType) {
      return null;
    }

    const updatedParams = { ...urlParams, transactionType };

    return (
      <React.Fragment>
        {serviceTransactionTypes.length > 1 ? (
          <EuiFormRow>
            <EuiSelect
              options={serviceTransactionTypes.map(type => ({
                text: `Filter by type: ${type}`,
                value: type
              }))}
              value={transactionType}
              onChange={this.handleTypeChange}
            />
          </EuiFormRow>
        ) : null}

        <TransactionOverviewChartsRequest
          urlParams={updatedParams}
          render={({ data }) => (
            <TransactionCharts
              charts={data}
              location={location}
              urlParams={updatedParams}
            />
          )}
        />

        <EuiSpacer size="l" />

        <TransactionListRequest
          urlParams={updatedParams}
          render={({ data }) => (
            <List
              agentName={agentName}
              items={data}
              serviceName={serviceName}
            />
          )}
        />
      </React.Fragment>
    );
  }
}

export const TransactionOverview = withRouter<TransactionOverviewProps>(
  TransactionOverviewView
);
