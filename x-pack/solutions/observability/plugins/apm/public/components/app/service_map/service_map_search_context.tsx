/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { BoolQuery } from '@kbn/es-query';

export interface ServiceMapEsQuery {
  bool: BoolQuery;
}

/**
 * `null`      — search bar mounted but hasn't computed the query yet (gate fetch).
 * `undefined` — no search bar provider (embeddable path — don't gate).
 * `object`    — query is ready.
 */
export type ServiceMapEsQueryState = ServiceMapEsQuery | null | undefined;

interface ServiceMapSearchContextValue {
  esQuery: ServiceMapEsQueryState;
  setEsQuery: (q: ServiceMapEsQuery) => void;
  highlightedServiceNames: string[];
  setHighlightedServiceNames: (names: string[]) => void;
}

const ServiceMapSearchContext = createContext<ServiceMapSearchContextValue>({
  esQuery: undefined,
  setEsQuery: () => {},
  highlightedServiceNames: [],
  setHighlightedServiceNames: () => {},
});

export function ServiceMapSearchProvider({ children }: { children: React.ReactNode }) {
  const [esQuery, setEsQueryState] = useState<ServiceMapEsQueryState>(null);
  const [highlightedServiceNames, setHighlightedServiceNamesState] = useState<string[]>([]);

  const setEsQuery = useCallback((q: ServiceMapEsQuery) => {
    setEsQueryState(q);
  }, []);

  const setHighlightedServiceNames = useCallback((names: string[]) => {
    setHighlightedServiceNamesState((prev) => {
      if (prev.length === names.length && prev.every((name, index) => name === names[index])) {
        return prev;
      }
      return names;
    });
  }, []);

  const value = useMemo(
    () => ({ esQuery, setEsQuery, highlightedServiceNames, setHighlightedServiceNames }),
    [esQuery, setEsQuery, highlightedServiceNames, setHighlightedServiceNames]
  );

  return (
    <ServiceMapSearchContext.Provider value={value}>{children}</ServiceMapSearchContext.Provider>
  );
}

export function useServiceMapSearchContext() {
  return useContext(ServiceMapSearchContext);
}
