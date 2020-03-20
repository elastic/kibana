/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';

import { CoreStart } from '../../../../../src/core/public';
import { LicensingPluginSetup, ILicense } from '../../../licensing/public';
import { TelemetryPluginSetup } from '../../../../../src/plugins/telemetry/public';
import { ClientConfigType } from '../types';
import { BreadcrumbService } from './breadcrumbs';

const AppContext = createContext<AppDependencies | undefined>(undefined);

export interface AppDependencies {
  core: CoreStart;
  services: {
    breadcrumbService: BreadcrumbService;
  };
  plugins: {
    licensing: LicensingPluginSetup;
    telemetry?: TelemetryPluginSetup;
  };
  docLinks: {
    security: string;
  };
  store: {
    initialLicense: ILicense;
  };
  config: ClientConfigType;
}

export const AppContextProvider = ({
  children,
  value,
}: {
  value: AppDependencies;
  children: React.ReactNode;
}) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const AppContextConsumer = AppContext.Consumer;

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('"useAppContext" can only be called inside of AppContext.Provider!');
  }
  return ctx;
};
