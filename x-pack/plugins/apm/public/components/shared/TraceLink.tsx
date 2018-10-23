/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Transaction } from '../../../typings/Transaction';
import { ITransactionGroup } from '../../../typings/TransactionGroup';
import { KibanaLink, legacyEncodeURIComponent } from '../../utils/url';

interface TraceLinkProps {
  transactionDoc?: Transaction;
  transactionGroup?: ITransactionGroup | { [key: string]: any };
}

/**
 * Return the path and query used to build a trace link,
 * given either a v2 Transaction or a Transaction Group
 */
export function getLinkProps({
  transactionDoc,
  transactionGroup = {}
}: TraceLinkProps) {
  let {
    serviceName,
    transactionType,
    traceId,
    id: transactionId,
    name
  } = transactionGroup;

  if (transactionDoc) {
    serviceName = transactionDoc.context.service.name;
    transactionType = transactionDoc.transaction.type;
    traceId =
      transactionDoc.version === 'v2' ? transactionDoc.trace.id : undefined;
    transactionId = transactionDoc.transaction.id;
    name = transactionDoc.transaction.name;
  }

  if (!serviceName || !transactionType || !name) {
    return null;
  }

  const encodedName = legacyEncodeURIComponent(name);

  return {
    hash: `/${serviceName}/transactions/${transactionType}/${encodedName}`,
    query: {
      traceId,
      transactionId
    }
  };
}

export const TraceLink: React.SFC<TraceLinkProps> = props => {
  const linkProps = getLinkProps(props);

  if (!linkProps) {
    // TODO: Should this case return unlinked children, null, or something else?
    return <React.Fragment>{props.children}</React.Fragment>;
  }

  return (
    <KibanaLink pathname="/app/apm" {...linkProps}>
      {props.children}
    </KibanaLink>
  );
};
