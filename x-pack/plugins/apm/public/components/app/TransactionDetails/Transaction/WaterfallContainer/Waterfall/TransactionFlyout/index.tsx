/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiTitle
} from '@elastic/eui';
import React from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
// @ts-ignore
import DiscoverButton from 'x-pack/plugins/apm/public/components/shared/DiscoverButton';
// @ts-ignore
import { StickyProperties } from 'x-pack/plugins/apm/public/components/shared/StickyProperties';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
// @ts-ignore
import { legacyEncodeURIComponent } from '../../../../../../../utils/url';
import { StickyTransactionProperties } from '../../../StickyTransactionProperties';
import { TransactionPropertiesTableForFlyout } from '../../../TransactionPropertiesTableForFlyout';
import { FlyoutTopLevelProperties } from '../FlyoutTopLevelProperties';
import { IWaterfall } from '../waterfall_helpers/waterfall_helpers';

function getDiscoverQuery(id: string) {
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `_id:${id}`
      }
    }
  };
}

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

  const { context, transaction } = transactionDoc;

  return (
    <EuiFlyout onClose={onClose} size="l">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h4>Transaction details</h4>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <DiscoverButton query={getDiscoverQuery(transaction.id)}>
              {`Open in Discover`}
            </DiscoverButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <Link
              to={`/${context.service.name}/transactions/${
                transaction.type
              }/${legacyEncodeURIComponent(transaction.name)}`}
            >
              <EuiButton iconType="visLine">
                View transaction group details
              </EuiButton>
            </Link>
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
  );
}
