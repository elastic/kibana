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
import { Transaction } from '../../../../../../../../typings/Transaction';

// @ts-ignore
import DiscoverButton from '../../../../../../shared/DiscoverButton';

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
}

export function TransactionFlyout({ transaction, onClose }: Props) {
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
      <EuiFlyoutBody>test</EuiFlyoutBody>
    </EuiFlyout>
  );
}
