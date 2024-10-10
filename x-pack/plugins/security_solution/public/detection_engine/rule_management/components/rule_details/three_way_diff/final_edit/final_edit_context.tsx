/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type PropsWithChildren } from 'react';
import { invariant } from '../../../../../../../common/utils/invariant';

interface FinalEditContextType {
  fieldName: string;
  setReadOnlyMode: () => void;
}

const FinalEditContext = createContext<FinalEditContextType | null>(null);

interface FinalEditContextProviderProps {
  value: FinalEditContextType;
}

export function FinalEditContextProvider({
  children,
  value,
}: PropsWithChildren<FinalEditContextProviderProps>) {
  return <FinalEditContext.Provider value={value}>{children}</FinalEditContext.Provider>;
}

export function useFinalEditContext() {
  const context = useContext(FinalEditContext);

  invariant(context !== null, 'useFinalEditContext must be used inside a FinalEditContextProvider');

  return context;
}
