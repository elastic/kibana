/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { RRRRenderArgs } from 'react-redux-request';
import { Transaction as ITransaction } from '../../../../typings/Transaction';
// @ts-ignore
import { TransactionDetailsRequest } from '../../../store/reactReduxRequest/transactionDetails';
// @ts-ignore
import { TransactionDetailsChartsRequest } from '../../../store/reactReduxRequest/transactionDetailsCharts';
import { TransactionDistributionRequest } from '../../../store/reactReduxRequest/transactionDistribution';
import { IUrlParams } from '../../../store/urlParams';
// @ts-ignore
import TransactionCharts from '../../shared/charts/TransactionCharts';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
// @ts-ignore
import { HeaderLarge } from '../../shared/UIComponents';
import { Distribution } from './Distribution';
import { Transaction } from './Transaction';

interface Props {
  urlParams: IUrlParams;
  location: any;
  waterfallRoot: ITransaction;
}

export function TransactionDetailsView({
  urlParams,
  location,
  waterfallRoot
}: Props) {
  return (
    <div>
      <HeaderLarge>{urlParams.transactionName}</HeaderLarge>

      <KueryBar />

      <EuiSpacer size="s" />

      <TransactionDetailsChartsRequest
        urlParams={urlParams}
        render={({ data }: RRRRenderArgs<any>) => (
          <TransactionCharts
            charts={data}
            urlParams={urlParams}
            location={location}
          />
        )}
      />

      <TransactionDistributionRequest
        urlParams={urlParams}
        render={({ data }: RRRRenderArgs<any>) => (
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
        render={(res: RRRRenderArgs<any>) => {
          return (
            <Transaction
              location={location}
              transaction={res.data}
              urlParams={urlParams}
              waterfallRoot={waterfallRoot}
            />
          );
        }}
      />
    </div>
  );
}
