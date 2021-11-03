/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export interface CasesContextValue {
  owner: string[];
  appId: string;
  userCanCrud: boolean;
}

export const CasesContext = React.createContext<CasesContextValue | undefined>(undefined);

export const CasesProvider: React.FC<{ value: CasesContextValue }> = ({ children, value }) => (
  <CasesContext.Provider value={value}>{children}</CasesContext.Provider>
);
