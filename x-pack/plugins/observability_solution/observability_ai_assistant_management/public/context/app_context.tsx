/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { CoreStart, HttpSetup } from '@kbn/core/public';
import type { BuildFlavor } from '@kbn/config';
import type { StartDependencies } from '../plugin';

export interface ContextValue extends StartDependencies {
  application: CoreStart['application'];
  buildFlavor: BuildFlavor;
  http: HttpSetup;
  notifications: CoreStart['notifications'];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  uiSettings: CoreStart['uiSettings'];
}

export const AppContext = createContext<ContextValue>(null as any);

export const AppContextProvider = ({
  children,
  value,
}: {
  value: ContextValue;
  children: React.ReactNode;
}) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
