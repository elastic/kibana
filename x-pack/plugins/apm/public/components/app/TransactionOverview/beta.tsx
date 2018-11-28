/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore
import { TransactionListRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/transactionList';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
// @ts-ignore
import List from './List';

interface TransactionOverviewProps {
  agentName: string;
  serviceName: string;
  urlParams: IUrlParams;
}

export class TransactionOverview extends React.Component<
  TransactionOverviewProps
> {
  public render() {
    const { agentName, serviceName, urlParams } = this.props;
    return (
      <TransactionListRequest
        urlParams={urlParams}
        render={({ data }) => (
          <List agentName={agentName} items={data} serviceName={serviceName} />
        )}
      />
    );
  }
}
