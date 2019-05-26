/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiSpacer, EuiTitle, EuiHorizontalRule } from '@elastic/eui';
import _ from 'lodash';
import React from 'react';
import { useTransactionDetailsCharts } from '../../../hooks/useTransactionDetailsCharts';
import { useTransactionDistribution } from '../../../hooks/useTransactionDistribution';
import { useWaterfall } from '../../../hooks/useWaterfall';
import { TransactionCharts } from '../../shared/charts/TransactionCharts';
import { ApmHeader } from '../../shared/ApmHeader';
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
      <ApmHeader>
        <EuiTitle size="l">
          <h1>{urlParams.transactionName}</h1>
        </EuiTitle>
      </ApmHeader>

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
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      {transaction && (
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
