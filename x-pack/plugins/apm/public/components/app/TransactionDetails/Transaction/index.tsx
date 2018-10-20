/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import {
  PROCESSOR_EVENT,
  TRANSACTION_ID
} from '../../../../../common/constants';
import { Transaction as ITransaction } from '../../../../../typings/Transaction';
import { WaterfallResponse } from '../../../../../typings/waterfall';
import { IUrlParams } from '../../../../store/urlParams';
// @ts-ignore
import DiscoverButton from '../../../shared/DiscoverButton';
import EmptyMessage from '../../../shared/EmptyMessage';
import { StickyTransactionProperties } from './StickyTransactionProperties';
// @ts-ignore
import { TransactionPropertiesTable } from './TransactionPropertiesTable';
import { ViewTraceLink } from './ViewTraceLink';

interface Props {
  transaction: ITransaction;
  urlParams: IUrlParams;
  location: Location;
  waterfall: WaterfallResponse;
}

function getDiscoverQuery(transactionId: string) {
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `${PROCESSOR_EVENT}:transaction AND ${TRANSACTION_ID}:${transactionId}`
      }
    }
  };
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

  // v1 transactions are *always* root transactions
  const isRootTransaction = transaction.version === 'v1' || !transaction.parent;

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
              <DiscoverButton
                query={getDiscoverQuery(transaction.transaction.id)}
              >
                {`View transaction in Discover`}
              </DiscoverButton>
            </EuiFlexItem>

            {!isRootTransaction && (
              <EuiFlexItem grow={false}>
                <ViewTraceLink waterfall={waterfall} />
              </EuiFlexItem>
            )}
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

Transaction.propTypes = {
  location: PropTypes.object.isRequired,
  transaction: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};
