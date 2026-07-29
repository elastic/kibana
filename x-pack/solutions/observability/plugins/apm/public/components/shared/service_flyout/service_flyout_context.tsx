/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import type { Environment } from '../../../../common/environment_rt';
import type { ServiceSchemaType } from '../../../../common/service_schema_type';
import type { ServiceFlyoutService } from './types';

export interface ServiceFlyoutCapabilities {
  loading: boolean;
  error: Error | undefined;
  schema: ServiceSchemaType | undefined;
  header: { serviceNameLink: boolean; badges: boolean } | undefined;
  overview:
    | { transactions: boolean; transactionTypeFilter: boolean; infraMetrics: boolean }
    | undefined;
  footer: { alerts: boolean; slos: boolean } | undefined;
}

export interface ServiceFlyoutContextValue {
  // Plugin deps provided once by the flyout host — stable across the flyout's lifetime
  deps: {
    core: CoreStart;
    share: SharePublicStart;
    lens: LensPublicStart;
    dataViews: DataViewsPublicPluginStart;
    alerting?: AlertingPluginPublicSetup;
  };
  contextActions?: {
    openInNewDiscoverTab?: (params: {
      esqlQuery: string;
      timeRange: { from: string; to: string };
      tabLabel: string;
    }) => void;
  };
  // The service this flyout is showing
  service: ServiceFlyoutService;
  // Resolved once on open — drives conditional rendering throughout the flyout
  capabilities: ServiceFlyoutCapabilities;
  // APM index patterns — fetched once at the top level and shared to avoid duplicate requests
  indices: APMIndices | undefined;
  // Mutable query scope — changes stay local to the flyout and do not propagate to the host
  filters: {
    environment: Environment;
    setEnvironment: (environment: Environment) => void;
    rangeFrom: string;
    rangeTo: string;
    setRange: (range: { rangeFrom: string; rangeTo: string }) => void;
    refreshToken: number;
    onRefresh: () => void;
    // OTel-optional: APM services have transaction types, OTel services do not
    transactionType?: string;
    setTransactionType?: (transactionType: string) => void;
  };
}

const ServiceFlyoutContext = createContext<ServiceFlyoutContextValue | null>(null);

export function ServiceFlyoutContextProvider({
  value,
  children,
}: {
  value: ServiceFlyoutContextValue;
  children: React.ReactNode;
}) {
  return <ServiceFlyoutContext.Provider value={value}>{children}</ServiceFlyoutContext.Provider>;
}

export function useServiceFlyoutContext(): ServiceFlyoutContextValue {
  const ctx = useContext(ServiceFlyoutContext);
  if (!ctx)
    throw new Error('useServiceFlyoutContext must be used within a ServiceFlyoutContextProvider');
  return ctx;
}
