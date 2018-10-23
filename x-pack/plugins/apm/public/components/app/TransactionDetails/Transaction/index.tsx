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
  EuiTitle,
  EuiToolTip
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import React from 'react';
import { Transaction as ITransaction } from '../../../../../typings/Transaction';
import { IUrlParams } from '../../../../store/urlParams';
import EmptyMessage from '../../../shared/EmptyMessage';
import { TraceLink } from '../../../shared/TraceLink';
import { ActionMenu } from './ActionMenu';
import { StickyTransactionProperties } from './StickyTransactionProperties';
// @ts-ignore
import { TransactionPropertiesTable } from './TransactionPropertiesTable';

function MaybeViewTraceLink({
  root,
  transaction
}: {
  root: ITransaction;
  transaction: ITransaction;
}) {
  const isRoot = transaction.transaction.id === root.transaction.id;
  let button;

  if (isRoot || !root) {
    button = (
      <EuiToolTip content="Currently viewing the full trace">
        <EuiButton iconType="apmApp" disabled={true}>
          View full trace
        </EuiButton>
      </EuiToolTip>
    );
  } else {
    button = <EuiButton iconType="apmApp">View full trace</EuiButton>;
  }

  return (
    <EuiFlexItem grow={false}>
      <TraceLink transaction={root}>{button}</TraceLink>
    </EuiFlexItem>
  );
}

interface Props {
  transaction: ITransaction;
  urlParams: IUrlParams;
  location: Location;
  waterfallRoot?: ITransaction;
}

export const Transaction: React.SFC<Props> = ({
  transaction,
  urlParams,
  location,
  waterfallRoot
}) => {
  if (isEmpty(transaction)) {
    return (
      <EmptyMessage
        heading="No transaction sample available."
        subheading="Try another time range, reset the search filter or select another bucket from the distribution histogram."
      />
    );
  }

  const root = waterfallRoot || transaction;

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
            <MaybeViewTraceLink transaction={transaction} root={root} />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <StickyTransactionProperties transaction={transaction} root={root} />

      <EuiSpacer />

      <TransactionPropertiesTable
        transaction={transaction}
        location={location}
        urlParams={urlParams}
      />
    </EuiPanel>
  );
};
