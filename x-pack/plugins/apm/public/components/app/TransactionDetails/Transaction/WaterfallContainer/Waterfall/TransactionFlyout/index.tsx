/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle
} from '@elastic/eui';
import React from 'react';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';

// @ts-ignore
import DiscoverButton from 'x-pack/plugins/apm/public/components/shared/DiscoverButton';
// @ts-ignore
import { TransactionPropertiesTableForFlyout } from '../../../TransactionPropertiesTableForFlyout';

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
  location: Location;
  urlParams: IUrlParams;
}

export function TransactionFlyout({
  transaction,
  onClose,
  location,
  urlParams
}: Props) {
  if (!transaction) {
    return null;
  }

  return (
    <EuiFlyout onClose={onClose} size="l">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>Transaction details</h2>
        </EuiTitle>

        <DiscoverButton query={getDiscoverQuery(transaction.transaction.id)}>
          {`Open in Discover`}
        </DiscoverButton>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <TransactionPropertiesTableForFlyout
          transaction={transaction}
          location={location}
          urlParams={urlParams}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
