/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React from 'react';
import { RRRRenderResponse } from 'react-redux-request';
import { TransactionDetailsRequest } from '../../../store/reactReduxRequest/transactionDetails';
// @ts-ignore
import { TransactionDetailsChartsRequest } from '../../../store/reactReduxRequest/transactionDetailsCharts';
import { TransactionDistributionRequest } from '../../../store/reactReduxRequest/transactionDistribution';
import { WaterfallRequest } from '../../../store/reactReduxRequest/waterfall';
import { IUrlParams } from '../../../store/urlParams';
// @ts-ignore
import TransactionCharts from '../../shared/charts/TransactionCharts';
import EmptyMessage from '../../shared/EmptyMessage';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
// @ts-ignore
import { HeaderLarge } from '../../shared/UIComponents';
import { Distribution } from './Distribution';
import { Transaction } from './Transaction';

interface Props {
  urlParams: IUrlParams;
  location: any;
}

export function TransactionDetailsView({ urlParams, location }: Props) {
  return (
    <div>
      <HeaderLarge>{urlParams.transactionName}</HeaderLarge>

      <KueryBar />

      <EuiSpacer size="s" />

      <TransactionDetailsChartsRequest
        urlParams={urlParams}
        render={({ data }: RRRRenderResponse<any>) => (
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
        render={({ data: transaction, status }) => {
          if (isEmpty(transaction)) {
            return (
              <EmptyMessage
                heading="No transaction sample available."
                subheading="Try another time range, reset the search filter or select another bucket from the distribution histogram."
              />
            );
          }

          return (
            <WaterfallRequest
              urlParams={urlParams}
              transaction={transaction}
              render={({ data: waterfall }) => {
                return (
                  <Transaction
                    location={location}
                    transaction={transaction}
                    urlParams={urlParams}
                    waterfall={waterfall}
                  />
                );
              }}
            />
          );
        }}
      />
    </div>
  );
}
