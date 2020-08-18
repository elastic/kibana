/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { format } from 'url';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';

export const getRedirectToTransactionDetailPageUrl = ({
  transaction,
  rangeFrom,
  rangeTo,
}: {
  transaction: Transaction;
  rangeFrom?: string;
  rangeTo?: string;
}) =>
  format({
    pathname: `/services/${transaction.service.name}/transactions/view`,
    query: {
      traceId: transaction.trace.id,
      transactionId: transaction.transaction.id,
      transactionName: transaction.transaction.name,
      transactionType: transaction.transaction.type,
      rangeFrom,
      rangeTo,
    },
  });
