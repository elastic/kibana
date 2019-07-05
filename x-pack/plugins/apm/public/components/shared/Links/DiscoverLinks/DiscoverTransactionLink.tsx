/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID
} from 'x-pack/plugins/apm/common/constants';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { DiscoverLink } from './DiscoverLink';

export function getDiscoverQuery(transaction: Transaction) {
  const transactionId = transaction.transaction.id;
  const traceId =
    transaction.version === 'v2' ? transaction.trace.id : undefined;

  let query = `${PROCESSOR_EVENT}:"transaction" AND ${TRANSACTION_ID}:"${transactionId}"`;
  if (traceId) {
    query += ` AND ${TRACE_ID}:"${traceId}"`;
  }
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query
      }
    }
  };
}

export const DiscoverTransactionLink: React.SFC<{
  readonly transaction: Transaction;
}> = ({ transaction, children }) => {
  return (
    <DiscoverLink query={getDiscoverQuery(transaction)} children={children} />
  );
};
