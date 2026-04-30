/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface SearchHighlightState {
  matchNodeIds: Set<string>;
  activeMatchNodeId: string | null;
}

interface ServiceMapSearchContextValue {
  setSearchHighlight: (state: SearchHighlightState) => void;
  matchNodeIds: Set<string>;
  activeMatchNodeId: string | null;
}

const EMPTY_SET = new Set<string>();

const ServiceMapSearchContext = createContext<ServiceMapSearchContextValue>({
  setSearchHighlight: () => {},
  matchNodeIds: EMPTY_SET,
  activeMatchNodeId: null,
});

export function ServiceMapSearchProvider({ children }: { children: React.ReactNode }) {
  const [matchNodeIds, setMatchNodeIds] = useState<Set<string>>(EMPTY_SET);
  const [activeMatchNodeId, setActiveMatchNodeId] = useState<string | null>(null);

  const setSearchHighlight = useCallback(
    ({ matchNodeIds: ids, activeMatchNodeId: activeId }: SearchHighlightState) => {
      setMatchNodeIds(ids);
      setActiveMatchNodeId(activeId);
    },
    []
  );

  const value = useMemo(
    () => ({ setSearchHighlight, matchNodeIds, activeMatchNodeId }),
    [setSearchHighlight, matchNodeIds, activeMatchNodeId]
  );

  return (
    <ServiceMapSearchContext.Provider value={value}>{children}</ServiceMapSearchContext.Provider>
  );
}

export const useServiceMapSearchContext = () => useContext(ServiceMapSearchContext);

export const useServiceMapSearchHighlight = (nodeId: string) => {
  const { matchNodeIds, activeMatchNodeId } = useContext(ServiceMapSearchContext);
  return useMemo(
    () => ({
      isSearchMatch: matchNodeIds.has(nodeId),
      isActiveSearchMatch: activeMatchNodeId === nodeId,
    }),
    [matchNodeIds, activeMatchNodeId, nodeId]
  );
};
