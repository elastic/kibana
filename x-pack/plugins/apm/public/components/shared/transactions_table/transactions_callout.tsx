/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import {
  maxTransactionGroupsTitle,
  TransactionDetailMaxGroupsMessage,
} from '../links/apm/transaction_detail_link/transaction_detail_max_groups_message';
import { ServiceTransactionGroupItem } from './get_columns';

interface Props {
  maxTransactionGroupsExceeded?: boolean;
  otherBucketTransactionGroup?: ServiceTransactionGroupItem;
}

export function TransactionsCallout({
  maxTransactionGroupsExceeded,
  otherBucketTransactionGroup,
}: Props) {
  if (!maxTransactionGroupsExceeded && !otherBucketTransactionGroup) {
    return <></>;
  }

  if (maxTransactionGroupsExceeded) {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.apm.transactionsCallout.cardinalityWarning.title',
          {
            defaultMessage:
              'Number of transaction groups exceed the allowed maximum(1,000) that are displayed.',
          }
        )}
        color="warning"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="xpack.apm.transactionsCallout.transactionGroupLimit.exceeded"
            defaultMessage="The maximum number of transaction groups displayed in Kibana has been reached. Try narrowing down results by using the query bar."
          />
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      title={maxTransactionGroupsTitle}
      color="warning"
      iconType="alert"
    >
      <p>
        <TransactionDetailMaxGroupsMessage
          remainingTransactions={
            otherBucketTransactionGroup?.overflowCount ?? 0
          }
        />
      </p>
    </EuiCallOut>
  );
}
