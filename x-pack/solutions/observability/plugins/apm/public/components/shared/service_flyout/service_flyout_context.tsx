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
import type { ApmPluginSetupDeps } from '../../../plugin';

export interface ServiceFlyoutContextValue {
  core: CoreStart;
  share: SharePluginSetup;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  plugins: ApmPluginSetupDeps;
}

const ServiceFlyoutContext = createContext({} as ServiceFlyoutContextValue);

export function ServiceFlyoutContextProvider({
  core,
  share,
  lens,
  dataViews,
  plugins,
  children,
}: ServiceFlyoutContextValue & { children: React.ReactNode }) {
  return (
    <ServiceFlyoutContext.Provider value={{ core, share, lens, dataViews, plugins }}>
      {children}
    </ServiceFlyoutContext.Provider>
  );
}

export function useServiceFlyoutContext(): ServiceFlyoutContextValue {
  return useContext(ServiceFlyoutContext);
}
