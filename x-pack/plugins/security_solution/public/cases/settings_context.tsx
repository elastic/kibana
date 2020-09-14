/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { CaseSettingsRegistry } from './types';

export interface CaseSettingsContextValue {
  caseSettingsRegistry: CaseSettingsRegistry;
}

const CaseSettingsContext = createContext<CaseSettingsContextValue | null>(null);

export const CaseSettingsContextProvider = ({
  children,
  value,
}: {
  value: CaseSettingsContextValue;
  children: React.ReactNode;
}) => {
  return <CaseSettingsContext.Provider value={value}>{children}</CaseSettingsContext.Provider>;
};

export const useCaseSettingsContext = () => {
  const ctx = useContext(CaseSettingsContext);
  if (!ctx) {
    throw new Error('CaseSettingsContext has not been set.');
  }

  return ctx;
};
