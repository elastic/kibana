/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import React from 'react';
import {
  Transaction as ITransaction,
  TransactionV2
} from '../../../../../typings/Transaction';
import { WaterfallResponse } from '../../../../../typings/waterfall';
import { IUrlParams } from '../../../../store/urlParams';
import EmptyMessage from '../../../shared/EmptyMessage';
import { TraceLink } from '../../../shared/TraceLink';
import { ActionMenu } from './ActionMenu';
import { StickyTransactionProperties } from './StickyTransactionProperties';
// @ts-ignore
import { TransactionPropertiesTable } from './TransactionPropertiesTable';

function MaybeViewTraceLink({
  waterfall,
  transaction
}: {
  waterfall: WaterfallResponse | null;
  transaction: ITransaction;
}) {
  // v1 transactions are *always* root transactions
  // v2 transactions with a parent should not show a trace link
  const isRoot = transaction.version === 'v1' || !transaction.parent;

  if (isRoot || waterfall === null) {
    return null;
  }

  const root = waterfall.hits.find(
    hit => hit.version === 'v2' && !hit.parent
  ) as TransactionV2;

  if (!root) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <TraceLink transactionDoc={root}>
        <EuiButton iconType="apmApp">View full trace</EuiButton>
      </TraceLink>
    </EuiFlexItem>
  );
}

interface Props {
  transaction: ITransaction;
  urlParams: IUrlParams;
  location: Location;
  waterfall: WaterfallResponse | null;
}

export const Transaction: React.SFC<Props> = ({
  transaction,
  urlParams,
  location,
  waterfall
}) => {
  if (isEmpty(transaction)) {
    return (
      <EmptyMessage
        heading="No transaction sample available."
        subheading="Try another time range, reset the search filter or select another bucket from the distribution histogram."
      />
    );
  }

  return (
    <EuiPanel paddingSize="m" hasShadow={true}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="s">
            <span>Transaction sample</span>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <ActionMenu transaction={transaction} />
            </EuiFlexItem>
            <MaybeViewTraceLink
              transaction={transaction}
              waterfall={waterfall}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <StickyTransactionProperties transaction={transaction} />

      <EuiSpacer />

      <TransactionPropertiesTable
        transaction={transaction}
        location={location}
        urlParams={urlParams}
      />
    </EuiPanel>
  );
};
