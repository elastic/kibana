/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPortal,
  EuiTitle
} from '@elastic/eui';
import React from 'react';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import { DiscoverTransactionLink } from '../../../ActionMenu';
import { StickyTransactionProperties } from '../../../StickyTransactionProperties';
import { TransactionPropertiesTableForFlyout } from '../../../TransactionPropertiesTableForFlyout';
import { FlyoutTopLevelProperties } from '../FlyoutTopLevelProperties';
import { IWaterfall } from '../waterfall_helpers/waterfall_helpers';

interface Props {
  onClose: () => void;
  transaction?: Transaction;
  location: any; // TODO: import location type from react router or history types?
  urlParams: IUrlParams;
  waterfall: IWaterfall;
}

export function TransactionFlyout({
  transaction: transactionDoc,
  onClose,
  location,
  urlParams,
  waterfall
}: Props) {
  if (!transactionDoc) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiFlyout onClose={onClose} size="m" ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h4>Transaction details</h4>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <DiscoverTransactionLink transaction={transactionDoc}>
                <EuiButtonEmpty iconType="discoverApp">
                  View transaction in Discover
                </EuiButtonEmpty>
              </DiscoverTransactionLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <FlyoutTopLevelProperties transaction={transactionDoc} />
          <EuiHorizontalRule />
          <StickyTransactionProperties transaction={transactionDoc} />
          <EuiHorizontalRule />
          <TransactionPropertiesTableForFlyout
            transaction={transactionDoc}
            location={location}
            urlParams={urlParams}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
