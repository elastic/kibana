/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { HeaderLarge } from '../../shared/UIComponents';
import { Distribution } from './Distribution';
import { TransactionDetailsChartsRequest } from '../../../store/reactReduxRequest/transactionDetailsCharts';
import { TransactionDistributionRequest } from '../../../store/reactReduxRequest/transactionDistribution';
import TransactionCharts from '../../shared/charts/TransactionCharts';
import { KueryBar } from '../../shared/KueryBar';
import { Transaction } from './Transaction';
import { TransactionDetailsRequest } from '../../../store/reactReduxRequest/transactionDetails';

function TransactionDetails({ urlParams, location }) {
  return (
    <div>
      <HeaderLarge>{urlParams.transactionName}</HeaderLarge>

      <KueryBar />

      <EuiSpacer size="s" />

      <TransactionDetailsChartsRequest
        urlParams={urlParams}
        render={({ data }) => (
          <TransactionCharts
            charts={data}
            urlParams={urlParams}
            location={location}
          />
        )}
      />

      <TransactionDistributionRequest
        urlParams={urlParams}
        render={({ data }) => (
          <Distribution
            distribution={data}
            urlParams={urlParams}
            location={location}
          />
        )}
      />

      <EuiSpacer size="l" />

      <TransactionDetailsRequest
        urlParams={urlParams}
        render={res => {
          return (
            <Transaction
              location={location}
              transaction={res.data}
              urlParams={urlParams}
            />
          );
        }}
      />
    </div>
  );
}

export default TransactionDetails;
