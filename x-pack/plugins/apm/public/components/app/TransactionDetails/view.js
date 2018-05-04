/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HeaderLarge } from '../../shared/UIComponents';
import Transaction from './Transaction';
import Distribution from './Distribution';
import { DetailsChartsRequest } from '../../../store/reactReduxRequest/detailsCharts';
import Charts from '../../shared/charts/TransactionCharts';
import { TransactionDistributionRequest } from '../../../store/reactReduxRequest/transactionDistribution';
import { TransactionDetailsRequest } from '../../../store/reactReduxRequest/transactionDetails';
import { KueryBar } from '../../shared/KueryBar';

function TransactionDetails({ urlParams }) {
  return (
    <div>
      <HeaderLarge>{urlParams.transactionName}</HeaderLarge>

      <KueryBar />

      <DetailsChartsRequest
        urlParams={urlParams}
        render={({ data }) => <Charts charts={data} urlParams={urlParams} />}
      />

      <TransactionDistributionRequest
        urlParams={urlParams}
        render={({ data }) => (
          <Distribution distribution={data} urlParams={urlParams} />
        )}
      />

      <TransactionDetailsRequest
        urlParams={urlParams}
        render={({ data }) => (
          <Transaction transaction={data} urlParams={urlParams} />
        )}
      />
    </div>
  );
}

export default TransactionDetails;
