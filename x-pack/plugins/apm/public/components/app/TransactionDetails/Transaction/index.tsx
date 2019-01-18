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
import { Location } from 'history';
import React from 'react';
import { Transaction as ITransaction } from '../../../../../typings/es_schemas/Transaction';
import { IUrlParams } from '../../../../store/urlParams';
import { TransactionActionMenu } from '../../../shared/TransactionActionMenu/TransactionActionMenu';
import { TransactionLink } from '../../../shared/TransactionLink';
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
  // the traceroot cannot be found, so we cannot link to it
  if (!waterfall.traceRoot) {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content="The trace parent cannot be found">
          <EuiButton iconType="apmTrace" disabled={true}>
            View full trace
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  const isRoot =
    transaction.transaction.id === waterfall.traceRoot.transaction.id;

  // the user is already viewing the full trace, so don't link to it
  if (isRoot) {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content="Currently viewing the full trace">
          <EuiButton iconType="apmTrace" disabled={true}>
            View full trace
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    );

    // the user is viewing a zoomed in version of the trace. Link to the full trace
  } else {
    return (
      <EuiFlexItem grow={false}>
        <TransactionLink transaction={waterfall.traceRoot}>
          <EuiButton iconType="apmTrace">View full trace</EuiButton>
        </TransactionLink>
      </EuiFlexItem>
    );
  }
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
              <TransactionActionMenu
                transaction={transaction}
                location={location}
              />
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
