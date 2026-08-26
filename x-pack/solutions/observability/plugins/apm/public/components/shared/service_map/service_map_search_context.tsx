/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// NOTE: this is the find-in-page *highlight* context (which nodes match the search box and which
// is the active match). It is intentionally distinct from the ES-query gating context in
// `components/app/service_map/service_map_search_context.tsx`; the two used to share export names
// (`ServiceMapSearchProvider` / `useServiceMapSearchContext`) which made imports ambiguous.

interface SearchHighlightState {
  matchNodeIds: Set<string>;
  activeMatchNodeId: string | null;
}

interface ServiceMapHighlightContextValue {
  setSearchHighlight: (state: SearchHighlightState) => void;
  matchNodeIds: Set<string>;
  activeMatchNodeId: string | null;
}

const EMPTY_SET = new Set<string>();

const ServiceMapHighlightContext = createContext<ServiceMapHighlightContextValue>({
  setSearchHighlight: () => {},
  matchNodeIds: EMPTY_SET,
  activeMatchNodeId: null,
});

export function ServiceMapHighlightProvider({ children }: { children: React.ReactNode }) {
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
    <ServiceMapHighlightContext.Provider value={value}>
      {children}
    </ServiceMapHighlightContext.Provider>
  );
}

export const useServiceMapHighlight = () => useContext(ServiceMapHighlightContext);

export const useServiceMapSearchHighlight = (nodeId: string) => {
  const { matchNodeIds, activeMatchNodeId } = useContext(ServiceMapHighlightContext);
  return useMemo(
    () => ({
      isSearchMatch: matchNodeIds.has(nodeId),
      isActiveSearchMatch: activeMatchNodeId === nodeId,
    }),
    [matchNodeIds, activeMatchNodeId, nodeId]
  );
};
