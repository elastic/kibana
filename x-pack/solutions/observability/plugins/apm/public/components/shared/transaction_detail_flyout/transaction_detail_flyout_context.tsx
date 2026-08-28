/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import React, { createContext, useContext } from 'react';
import type { TransactionDetailFlyoutFilters } from './types';

export interface FullTraceFlyoutState {
  traceId: string;
  contextSpanIds?: string[];
}

export interface TransactionDetailFlyoutContextValue {
  deps: {
    core: CoreStart;
  };
  filters: TransactionDetailFlyoutFilters;
  openFullTraceFlyout: (state: FullTraceFlyoutState) => void;
}

const TransactionDetailFlyoutContext = createContext<TransactionDetailFlyoutContextValue | null>(
  null
);

export function TransactionDetailFlyoutContextProvider({
  value,
  children,
}: {
  value: TransactionDetailFlyoutContextValue;
  children: React.ReactNode;
}) {
  return (
    <TransactionDetailFlyoutContext.Provider value={value}>
      {children}
    </TransactionDetailFlyoutContext.Provider>
  );
}

export function useTransactionDetailFlyoutContext(): TransactionDetailFlyoutContextValue {
  const context = useContext(TransactionDetailFlyoutContext);
  if (!context) {
    throw new Error(
      'useTransactionDetailFlyoutContext must be used within a TransactionDetailFlyoutContextProvider'
    );
  }
  return context;
}
