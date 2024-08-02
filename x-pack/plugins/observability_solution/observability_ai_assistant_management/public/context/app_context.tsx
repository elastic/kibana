/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';

export interface AppContextValue {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

export const AppContext = createContext<AppContextValue>(null as any);

export const AppContextProvider = ({
  children,
  value,
}: {
  value: AppContextValue;
  children: React.ReactNode;
}) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
