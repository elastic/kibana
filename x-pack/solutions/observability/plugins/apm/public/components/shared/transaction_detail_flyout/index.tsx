/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import React, { useMemo } from 'react';
import { ResponsiveFlyout } from '../responsive_flyout';
import { TransactionDetailFlyoutHeader } from './header';
import { TransactionDetailFlyoutLatencyDistribution } from './latency_distribution';
import { TransactionDetailFlyoutRedMetrics } from './red_metrics';
import { TransactionDetailFlyoutTraceSample } from './trace_sample';
import {
  TransactionDetailFlyoutContextProvider,
  type TransactionDetailFlyoutContextValue,
} from './transaction_detail_flyout_context';
import type { TransactionDetailFlyoutProps } from './types';

export const TRANSACTION_DETAIL_FLYOUT_HISTORY_KEY = Symbol.for('apmTransactionDetailFlyout');

interface TransactionDetailFlyoutComponentProps extends TransactionDetailFlyoutProps {
  deps: TransactionDetailFlyoutContextValue['deps'];
}

export function TransactionDetailFlyout({
  deps,
  filters,
  isOpen = true,
  onClose,
  historyKey = TRANSACTION_DETAIL_FLYOUT_HISTORY_KEY,
}: TransactionDetailFlyoutComponentProps) {
  const { transactionName } = filters;
  const titleId = useGeneratedHtmlId({ prefix: 'transactionDetailFlyoutTitle' });

  const contextValue = useMemo<TransactionDetailFlyoutContextValue>(
    () => ({
      deps,
      filters,
    }),
    [deps, filters]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <TransactionDetailFlyoutContextProvider value={contextValue}>
      <ResponsiveFlyout
        data-test-subj="transactionDetailFlyout"
        flyoutMenuDisplayMode="always"
        onClose={onClose}
        ownFocus={false}
        size="s"
        paddingSize="m"
        resizable
        minWidth={660}
        session="inherit"
        historyKey={historyKey}
        flyoutMenuProps={{ title: transactionName }}
        aria-labelledby={titleId}
      >
        <TransactionDetailFlyoutHeader transactionName={transactionName} titleId={titleId} />
        <EuiFlyoutBody>
          <TransactionDetailFlyoutRedMetrics />
          <EuiSpacer size="m" />
          <TransactionDetailFlyoutLatencyDistribution />
          <EuiSpacer size="m" />
          <TransactionDetailFlyoutTraceSample />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </TransactionDetailFlyoutContextProvider>
  );
}
