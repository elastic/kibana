/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import type { TransactionDetailRedirectInfo } from '../../../../server/routes/transactions/get_transaction_by_trace';

export const getRedirectToTransactionDetailPageUrl = ({
  transaction,
  rangeFrom,
  rangeTo,
  waterfallItemId,
}: {
  transaction: TransactionDetailRedirectInfo;
  rangeFrom?: string;
  rangeTo?: string;
  waterfallItemId?: string;
}) => {
  return format({
    pathname: `/services/${transaction.service.name}/transactions/view`,
    query: {
      traceId: transaction.trace.id,
      transactionId: transaction.transaction.id,
      transactionName: transaction.transaction.name,
      transactionType: transaction.transaction.type,
      rangeFrom:
        rangeFrom ||
        roundToNearestMinute({
          timestamp: transaction['@timestamp'],
          direction: 'down',
        }),
      rangeTo:
        rangeTo ||
        roundToNearestMinute({
          timestamp: transaction['@timestamp'],
          diff: transaction.transaction.duration.us / 1000,
          direction: 'up',
        }),
      waterfallItemId,
    },
  });
};

function roundToNearestMinute({
  timestamp,
  diff = 0,
  direction = 'up',
}: {
  timestamp: string;
  diff?: number;
  direction?: 'up' | 'down';
}) {
  const date = new Date(timestamp);
  const fiveMinutes = 1000 * 60 * 5; // round to 5 min

  const ms = date.getTime() + diff;

  return new Date(
    direction === 'down'
      ? Math.floor(ms / fiveMinutes) * fiveMinutes
      : Math.ceil(ms / fiveMinutes) * fiveMinutes
  ).toISOString();
}
