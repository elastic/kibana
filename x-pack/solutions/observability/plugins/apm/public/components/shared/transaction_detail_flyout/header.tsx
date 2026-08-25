/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';

interface TransactionDetailFlyoutHeaderProps {
  transactionName: string;
  titleId: string;
}

export function TransactionDetailFlyoutHeader({
  transactionName,
  titleId,
}: TransactionDetailFlyoutHeaderProps) {
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2 id={titleId} data-test-subj="transactionDetailFlyoutTitle">
          {transactionName}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
}
