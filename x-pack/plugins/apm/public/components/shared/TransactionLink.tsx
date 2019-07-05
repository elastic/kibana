/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Transaction } from '../../../typings/es_schemas/Transaction';
import { KibanaLink } from './Links/KibanaLink';
import { legacyEncodeURIComponent } from './Links/url_helpers';

interface TransactionLinkProps {
  transaction?: Transaction;
}

/**
 * Return the path and query used to build a trace link,
 * given either a v2 Transaction or a Transaction Group
 */
export function getLinkProps(transaction: Transaction) {
  const serviceName = transaction.context.service.name;
  const transactionType = transaction.transaction.type;
  const traceId =
    transaction.version === 'v2' ? transaction.trace.id : undefined;
  const transactionId = transaction.transaction.id;
  const name = transaction.transaction.name;

  const encodedName = legacyEncodeURIComponent(name);

  return {
    hash: `/${serviceName}/transactions/${transactionType}/${encodedName}`,
    query: {
      traceId,
      transactionId
    }
  };
}

export const TransactionLink: React.SFC<TransactionLinkProps> = ({
  transaction,
  children
}) => {
  if (!transaction) {
    return null;
  }

  const linkProps = getLinkProps(transaction);

  if (!linkProps) {
    // TODO: Should this case return unlinked children, null, or something else?
    return <React.Fragment>{children}</React.Fragment>;
  }

  return <KibanaLink {...linkProps}>{children}</KibanaLink>;
};
