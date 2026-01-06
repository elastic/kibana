/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Duration, Timestamp } from '@kbn/apm-ui-shared';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { Summary } from '.';
import { ErrorCountSummaryItemBadge } from './error_count_summary_item_badge';
import { HttpInfoSummaryItem } from './http_info_summary_item';
import { TransactionResultSummaryItem } from './transaction_result_summary_item';
import { UserAgentSummaryItem } from './user_agent_summary_item';
import { ColdStartBadge } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/badge/cold_start_badge';
import { buildUrl } from '../../../utils/build_url';

interface Props {
  transaction: Transaction;
  totalDuration: number | undefined;
  errorCount: number;
  coldStartBadge?: boolean;
}

function getTransactionResultSummaryItem(transaction: Transaction) {
  const result = transaction.transaction.result;
  const urlFull = transaction.url?.full || transaction.transaction?.page?.url;

  const url = urlFull ?? buildUrl(transaction);

  if (url) {
    const method = transaction.http?.request?.method;
    const status = transaction.http?.response?.status_code;
    return <HttpInfoSummaryItem method={method} status={status} url={url} />;
  }

  if (result) {
    return <TransactionResultSummaryItem transactionResult={result} />;
  }

  return null;
}

function TransactionSummary({ transaction, totalDuration, errorCount, coldStartBadge }: Props) {
  const items = [
    <Timestamp timestamp={transaction.timestamp.us / 1000} renderMode="tooltip" />,
    <Duration
      duration={transaction.transaction.duration.us}
      parent={{
        duration: totalDuration,
        type: 'trace',
      }}
      showTooltip={true}
    />,
    getTransactionResultSummaryItem(transaction),
    errorCount ? <ErrorCountSummaryItemBadge count={errorCount} /> : null,
    transaction.user_agent ? <UserAgentSummaryItem {...transaction.user_agent} /> : null,
    coldStartBadge ? <ColdStartBadge /> : null,
  ];

  return <Summary items={items} />;
}

export { TransactionSummary };
