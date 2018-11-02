/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
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
import { TransactionLink } from '../../../shared/TransactionLink';
import { DiscoverTransactionLink } from './ActionMenu';
import { StickyTransactionProperties } from './StickyTransactionProperties';
import { TransactionPropertiesTable } from './TransactionPropertiesTable';
import { IWaterfall } from './WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

function MaybeViewTraceLink({
  transaction,
  waterfall
}: {
  transaction: ITransaction;
  waterfall: IWaterfall;
}) {
  const isRoot =
    transaction.transaction.id ===
    (waterfall.traceRoot && waterfall.traceRoot.transaction.id);

  let button;
  if (isRoot) {
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
      <TransactionLink transaction={waterfall.traceRoot}>
        {button}
      </TransactionLink>
    </EuiFlexItem>
  );
}

interface Props {
  transaction: ITransaction;
  urlParams: IUrlParams;
  location: Location;
  waterfall: IWaterfall;
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
    <EuiPanel paddingSize="m">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h5>Transaction sample</h5>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <DiscoverTransactionLink transaction={transaction}>
                <EuiButtonEmpty iconType="discoverApp">
                  View transaction in Discover
                </EuiButtonEmpty>
              </DiscoverTransactionLink>
            </EuiFlexItem>
            <MaybeViewTraceLink
              transaction={transaction}
              waterfall={waterfall}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <StickyTransactionProperties
        transaction={transaction}
        totalDuration={waterfall.traceRootDuration}
      />

      <EuiSpacer />

      <TransactionPropertiesTable
        transaction={transaction}
        location={location}
        urlParams={urlParams}
        waterfall={waterfall}
      />
    </EuiPanel>
  );
};
