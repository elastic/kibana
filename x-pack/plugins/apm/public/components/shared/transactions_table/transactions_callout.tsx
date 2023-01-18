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
import { TransactionDetailMaxGroupsMessage } from '../links/apm/transaction_detail_link/transaction_detail_max_groups_message';

interface Props {
  maxTransactionGroupsExceeded?: boolean;
  otherBucketTransactionGroup?: boolean;
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
          'xpack.apm.transactionsTable.cardinalityWarning.title',
          {
            defaultMessage:
              'This view shows a subset of reported transactions.',
          }
        )}
        color="danger"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="xpack.apm.transactionsTable.transactiongrouplimit.exceeded"
            defaultMessage="The number of unique transaction names limit was exceeded. Try narrowing down your results using the query bar."
          />
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.apm.transactionsTable.cardinalityWarning.title',
        {
          defaultMessage: 'This view shows a subset of reported transactions.',
        }
      )}
      color="danger"
      iconType="alert"
    >
      <p>
        <TransactionDetailMaxGroupsMessage />
      </p>
    </EuiCallOut>
  );
}
