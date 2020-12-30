/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { createContext } from 'react';

export interface Context {
  isCloudEnabled: boolean;
}

export const AppContext = createContext<Context>({} as any);

export const AppContextProvider = ({
  children,
  context,
}: {
  children: React.ReactNode;
  context: Context;
}) => {
  return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
};
