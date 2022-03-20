/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../../../common/elasticsearch_fieldnames';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { DiscoverLink } from './discover_link';

export function getDiscoverQuery(transaction: Transaction) {
  const transactionId = transaction.transaction.id;
  const traceId = transaction.trace.id;

  let query = `${PROCESSOR_EVENT}:"transaction" AND ${TRANSACTION_ID}:"${transactionId}"`;
  if (traceId) {
    query += ` AND ${TRACE_ID}:"${traceId}"`;
  }
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'kuery',
        query,
      },
    },
  };
}

export function DiscoverTransactionLink({
  transaction,
  children,
}: {
  readonly transaction: Transaction;
  children?: ReactNode;
}) {
  return (
    <DiscoverLink query={getDiscoverQuery(transaction)} children={children} />
  );
}
