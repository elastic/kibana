/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import type { ServiceSchemaType } from '@kbn/apm-types';
import type { TimeRange } from '@kbn/es-query';
import React, { createContext, useContext } from 'react';
import type { TransactionDetailFlyoutFilters } from './types';

export interface FullTraceFlyoutState {
  traceId: string;
  contextSpanIds?: string[];
}

export interface TransactionDetailFlyoutContextValue {
  deps: {
    core: CoreStart;
    share?: SharePublicStart;
    /** Required for document-based (ES|QL) RED charts. */
    lens?: LensPublicStart;
    dataViews?: DataViewsPublicPluginStart;
  };
  contextActions?: {
    openInNewDiscoverTab?: (params: {
      esqlQuery: string;
      timeRange: TimeRange;
      tabLabel: string;
    }) => void;
  };
  filters: TransactionDetailFlyoutFilters;
  /**
   * From hosts whose surrounding UI is computed from raw documents (Discover).
   * Combined with OTel schema, selects ES|QL RED charts over APM chart APIs.
   */
  preferDocumentBasedCharts?: boolean;
  schema?: ServiceSchemaType;
  /** APM index patterns for ES|QL charts — undefined loading, null failed. */
  indices?: APMIndices | null;
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
