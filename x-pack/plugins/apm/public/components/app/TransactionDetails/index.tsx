/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiSpacer, EuiTitle, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import React from 'react';
import { useTransactionDetailsCharts } from '../../../hooks/useTransactionDetailsCharts';
import { useTransactionDistribution } from '../../../hooks/useTransactionDistribution';
import { useWaterfall } from '../../../hooks/useWaterfall';
import { TransactionCharts } from '../../shared/charts/TransactionCharts';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { FilterBar } from '../../shared/FilterBar';
import { TransactionDistribution } from './Distribution';
import { Transaction } from './Transaction';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';

export function TransactionDetails() {
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const { data: distributionData } = useTransactionDistribution(urlParams);
  const { data: transactionDetailsChartsData } = useTransactionDetailsCharts(
    urlParams
  );
  const { data: waterfall } = useWaterfall(urlParams);
  const transaction = waterfall.getTransactionById(urlParams.transactionId);

  return (
    <div>
      <EuiTitle size="l">
        <h1>{urlParams.transactionName}</h1>
      </EuiTitle>

      <EuiSpacer />
      <FilterBar />
      <EuiSpacer size="s" />

      <TransactionCharts
        hasMLJob={false}
        charts={transactionDetailsChartsData}
        urlParams={urlParams}
        location={location}
      />

      <EuiHorizontalRule size="full" margin="l" />

      <EuiPanel>
        <TransactionDistribution
          distribution={distributionData}
          urlParams={urlParams}
          location={location}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      {!transaction ? (
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
      ) : (
        <Transaction
          location={location}
          transaction={transaction}
          urlParams={urlParams}
          waterfall={waterfall}
        />
      )}
    </div>
  );
}
