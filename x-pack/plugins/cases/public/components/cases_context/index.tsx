/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DEFAULT_BASE_PATH } from '../../common/navigation';

export interface CasesContextValue {
  owner: string[];
  appId: string;
  userCanCrud: boolean;
  basePath: string;
}
export interface CasesContextProps extends Omit<CasesContextValue, 'basePath'> {
  basePath?: string;
}

export const CasesContext = React.createContext<CasesContextValue | undefined>(undefined);

export const CasesProvider: React.FC<{ value: CasesContextProps }> = ({
  children,
  value: { basePath = DEFAULT_BASE_PATH, ...value },
}) => {
  return <CasesContext.Provider value={{ basePath, ...value }}>{children}</CasesContext.Provider>;
};
