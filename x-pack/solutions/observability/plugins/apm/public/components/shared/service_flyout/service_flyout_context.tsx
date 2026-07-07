/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';

interface ServiceFlyoutContextValue {
  core: CoreStart;
  share: SharePluginSetup;
}

const ServiceFlyoutContext = createContext({} as ServiceFlyoutContextValue);

export function ServiceFlyoutContextProvider({
  core,
  share,
  children,
}: ServiceFlyoutContextValue & { children: React.ReactNode }) {
  return (
    <ServiceFlyoutContext.Provider value={{ core, share }}>
      {children}
    </ServiceFlyoutContext.Provider>
  );
}

export function useServiceFlyoutContext(): ServiceFlyoutContextValue {
  return useContext(ServiceFlyoutContext);
}
