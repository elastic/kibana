/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { AggregatedTransactionsBadge } from '../../../shared/aggregated_transactions_badge';
import { MobileTransactionCharts } from '../../../shared/charts/transaction_charts/mobile_transaction_charts';
import { TransactionsTable } from '../../../shared/transactions_table';
import { replace } from '../../../shared/links/url_helpers';
import { getKueryWithMobileFilters } from '../../../../../common/utils/get_kuery_with_mobile_filters';

export function MobileTransactionOverview() {
  const {
    query: {
      environment,
      rangeFrom,
      rangeTo,
      transactionType: transactionTypeFromUrl,
      device,
      osVersion,
      appVersion,
      netConnectionType,
      kuery,
    },
  } = useApmParams('/mobile-services/{serviceName}/transactions');

  const kueryWithFilters = getKueryWithMobileFilters({
    device,
    osVersion,
    appVersion,
    netConnectionType,
    kuery,
  });

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { transactionType, fallbackToTransactions } = useApmServiceContext();

  const history = useHistory();

  // redirect to first transaction type
  if (!transactionTypeFromUrl && transactionType) {
    replace(history, { query: { transactionType } });
  }

  return (
    <>
      <EuiFlexItem>
        <EuiHorizontalRule />
      </EuiFlexItem>
      {fallbackToTransactions && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <AggregatedTransactionsBadge />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      <MobileTransactionCharts
        kuery={kueryWithFilters}
        environment={environment}
        start={start}
        end={end}
      />
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true}>
        <TransactionsTable
          hideViewTransactionsLink
          numberOfTransactionsPerPage={25}
          showMaxTransactionGroupsExceededWarning
          environment={environment}
          kuery={kueryWithFilters}
          start={start}
          end={end}
          saveTableOptionsToUrl
        />
      </EuiPanel>
    </>
  );
}
