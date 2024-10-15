/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren, createContext, useContext } from 'react';

interface InventoryPageViewContext {
  grouping: string;
  setGrouping: React.Dispatch<React.SetStateAction<string>>;
}

export const InventoryPageViewContext = createContext<InventoryPageViewContext | null>(null);

export function InventoryPageViewContextProvider({
  children,
  grouping,
  setGrouping,
}: PropsWithChildren<{
  grouping: string;
  setGrouping: React.Dispatch<React.SetStateAction<string>>;
}>) {
  return (
    <InventoryPageViewContext.Provider value={{ grouping, setGrouping }}>
      {children}
    </InventoryPageViewContext.Provider>
  );
}

export function useInventoryPageViewContext(): InventoryPageViewContext {
  const context = useContext(InventoryPageViewContext);

  if (!context) {
    throw new Error('Context not found');
  }

  return context;
}
