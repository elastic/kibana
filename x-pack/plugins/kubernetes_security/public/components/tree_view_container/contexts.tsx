/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { useTreeView, UseTreeViewProps } from './hooks';

type TreeViewContextType = ReturnType<typeof useTreeView>;

const TreeViewContext = createContext<TreeViewContextType | null>(null);

export const useTreeViewContext = () => {
  const context = useContext(TreeViewContext);
  if (!context) {
    throw new Error('useTreeViewContext must be called within an TreeViewContextProvider');
  }
  return context;
};

type TreeViewContextProviderProps = {
  children: JSX.Element;
};

export const TreeViewContextProvider = ({
  children,
  ...useTreeViewProps
}: TreeViewContextProviderProps & UseTreeViewProps) => {
  return (
    <TreeViewContext.Provider value={useTreeView(useTreeViewProps)}>
      {children}
    </TreeViewContext.Provider>
  );
};
