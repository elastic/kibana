/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import React, { createContext, useContext } from 'react';
import type { Environment } from '../../../../common/environment_rt';
import type { RequestFlyoutConnection } from './types';

export interface RequestFlyoutFilters {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  start: string;
  end: string;
  rangeFrom: string;
  rangeTo: string;
  setRange: (r: { rangeFrom: string; rangeTo: string }) => void;
}

export interface RequestFlyoutContextValue {
  deps: {
    core: CoreStart;
    share?: SharePublicStart;
    lens?: LensPublicStart;
    dataViews?: DataViewsPublicPluginStart;
  };
  connection: RequestFlyoutConnection;
  filters: RequestFlyoutFilters;
  /** Increments when the user presses the refresh button inside the flyout. */
  refreshToken: number;
  onRefresh: () => void;
}

const RequestFlyoutContext = createContext<RequestFlyoutContextValue | null>(null);

export function RequestFlyoutContextProvider({
  value,
  children,
}: {
  value: RequestFlyoutContextValue;
  children: React.ReactNode;
}) {
  return <RequestFlyoutContext.Provider value={value}>{children}</RequestFlyoutContext.Provider>;
}

export function useRequestFlyoutContext(): RequestFlyoutContextValue {
  const ctx = useContext(RequestFlyoutContext);
  if (!ctx) {
    throw new Error('useRequestFlyoutContext must be used within a RequestFlyoutContextProvider');
  }
  return ctx;
}
