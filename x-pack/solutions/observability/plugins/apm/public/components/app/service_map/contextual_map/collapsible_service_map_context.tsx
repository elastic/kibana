/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

export interface CollapsibleServiceMapContextValue {
  expandedNodeIds: ReadonlySet<string>;
  onExpand: (nodeId: string) => void;
  onCollapse: (nodeId: string) => void;
  getHiddenDependencyCount: (nodeId: string) => number;
  getHiddenAttentionCount: (nodeId: string) => number;
}

const CollapsibleServiceMapContext = createContext<CollapsibleServiceMapContextValue | null>(null);

export function CollapsibleServiceMapProvider({
  value,
  children,
}: {
  value: CollapsibleServiceMapContextValue;
  children: React.ReactNode;
}) {
  return (
    <CollapsibleServiceMapContext.Provider value={value}>
      {children}
    </CollapsibleServiceMapContext.Provider>
  );
}

export function useCollapsibleServiceMapContext(): CollapsibleServiceMapContextValue {
  const ctx = useContext(CollapsibleServiceMapContext);
  if (!ctx) {
    throw new Error(
      'useCollapsibleServiceMapContext must be used within CollapsibleServiceMapProvider'
    );
  }
  return ctx;
}
