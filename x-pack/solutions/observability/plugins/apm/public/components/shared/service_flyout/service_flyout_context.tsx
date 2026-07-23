/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { PluginSetupContract as AlertingPluginPublicSetup } from '@kbn/alerting-plugin/public';
import type { Environment } from '../../../../common/environment_rt';
import type { ServiceFlyoutService } from './types';

export interface ServiceFlyoutContextValue {
  // Plugin deps provided once by the flyout host — stable across the flyout's lifetime
  deps: {
    core: CoreStart;
    share: SharePluginSetup;
    lens: LensPublicStart;
    dataViews: DataViewsPublicPluginStart;
    alerting?: AlertingPluginPublicSetup;
  };
  // The service this flyout is showing
  service: ServiceFlyoutService;
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
