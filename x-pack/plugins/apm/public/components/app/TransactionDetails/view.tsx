/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
import { TransactionDetailsChartsRequest } from '../../../store/reactReduxRequest/transactionDetailsCharts';
import { TransactionDistributionRequest } from '../../../store/reactReduxRequest/transactionDistribution';
import { WaterfallRequest } from '../../../store/reactReduxRequest/waterfall';
import { IUrlParams } from '../../../store/urlParams';
import { TransactionCharts } from '../../shared/charts/TransactionCharts';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { FilterBar } from '../../shared/FilterBar';
import { Distribution } from './Distribution';
import { Transaction } from './Transaction';

interface Props {
  mlAvailable: boolean;
  urlParams: IUrlParams;
  location: Location;
}

export function TransactionDetailsView({ urlParams, location }: Props) {
  return (
    <div>
      <EuiTitle size="l">
        <h1>{urlParams.transactionName}</h1>
      </EuiTitle>

      <EuiSpacer />

      <FilterBar />

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

      <EuiSpacer />

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
      <WaterfallRequest
        urlParams={urlParams}
        traceId={urlParams.traceId}
        render={({ data: waterfall }) => {
          const transaction = waterfall.getTransactionById(
            urlParams.transactionId
          );
          if (!transaction) {
            return (
              <EmptyMessage
                heading={i18n.translate(
                  'xpack.apm.transactionDetails.noTransactionTitle',
                  {
                    defaultMessage: 'No transaction sample available.'
                  }
                )}
                subheading={i18n.translate(
                  'xpack.apm.transactionDetails.noTransactionDescription',
                  {
                    defaultMessage:
                      'Try another time range, reset the search filter or select another bucket from the distribution histogram.'
                  }
                )}
              />
            );
          }

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
    </div>
  );
}
