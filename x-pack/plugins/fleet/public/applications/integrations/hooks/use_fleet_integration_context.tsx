/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';

import {
  FleetStatusProvider,
  KibanaVersionContext,
  UIExtensionsContextProvider,
} from '../../../hooks';

import type { FleetStartServices } from '../../../plugin';

import { PackageInstallProvider } from './use_package_install';
import { IntegrationsStateContextProvider } from './use_integrations_state';

interface FleetIntegrationsStateContextValue {
  pkgkey: string | undefined;
  startServices: FleetStartServices | undefined;
}

const FleetIntegrationsStateContext = createContext<FleetIntegrationsStateContextValue>({
  pkgkey: undefined,
  startServices: undefined,
});

export const FleetIntegrationsStateContextProvider: React.FC<{
  children?: React.ReactNode;
  values: FleetIntegrationsStateContextValue;
  /* fix hard coded KibanaVersion */
}> = ({ children, values: { startServices, kibanaVersion = '8.16.0' } }) => {
  return (
    <FleetIntegrationsStateContext.Provider value={{ fleet: startServices.fleet }}>
      <KibanaVersionContext.Provider value={kibanaVersion}>
        <UIExtensionsContextProvider values={{}}>
          <FleetStatusProvider>
            <PackageInstallProvider startServices={startServices}>
              <IntegrationsStateContextProvider>{children}</IntegrationsStateContextProvider>
            </PackageInstallProvider>
          </FleetStatusProvider>
        </UIExtensionsContextProvider>
      </KibanaVersionContext.Provider>
    </FleetIntegrationsStateContext.Provider>
  );
};

export const useFleetIntegrationsStateContext = () => {
  const ctx = React.useContext(FleetIntegrationsStateContext);
  if (!ctx) {
    throw new Error(
      'useFleetIntegrationsStateContext can only be used inside of FleetIntegrationsStateContextProvider'
    );
  }
  return ctx;
};
