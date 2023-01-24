/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const txGroupsDroppedBucketName = '_other';

export const maxTransactionGroupsTitle = i18n.translate(
  'xpack.apm.transactionsCallout.maxTransactionGroups.title',
  {
    defaultMessage: 'The number of transaction groups has been reached.',
  }
);

export function TransactionDetailMaxGroupsMessage({
  remainingTransactions,
}: {
  remainingTransactions: number;
}) {
  return (
    <FormattedMessage
      defaultMessage="Current APM server capacity for handling unique transaction groups has been reached. There are at least {remainingTransactions, plural, one {1 transaction} other {# transactions}} missing in this list. Please decrease the number of transaction groups in your service or increase the memory allocated to APM server."
      id="xpack.apm.transactionDetail.maxGroups.message"
      values={{
        remainingTransactions,
      }}
    />
  );
}
