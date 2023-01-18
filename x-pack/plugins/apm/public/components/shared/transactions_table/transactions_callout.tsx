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

  const title = i18n.translate(
    'xpack.apm.transactionsTable.cardinalityWarning.title',
    {
      defaultMessage: 'This view shows a subset of reported transactions.',
    }
  );

  if (maxTransactionGroupsExceeded) {
    return (
      <EuiCallOut title={title} color="danger" iconType="alert">
        <p>
          <FormattedMessage
            id="xpack.apm.transactionsTable.transactionGroupLimit.exceeded"
            defaultMessage="The transaction group limit in Kibana has been reached. Excess groups have been omitted. Try narrowing down your results using the query bar."
          />
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut title={title} color="danger" iconType="alert">
      <p>
        <TransactionDetailMaxGroupsMessage />
      </p>
    </EuiCallOut>
  );
}
