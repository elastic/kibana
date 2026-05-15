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

interface ServiceMapSearchContextValue {
  esQuery: ServiceMapEsQuery | undefined;
  setEsQuery: (q: ServiceMapEsQuery | undefined) => void;
}

const ServiceMapSearchContext = createContext<ServiceMapSearchContextValue>({
  esQuery: undefined,
  setEsQuery: () => {},
});

export function ServiceMapSearchProvider({ children }: { children: React.ReactNode }) {
  const [esQuery, setEsQueryState] = useState<ServiceMapEsQuery | undefined>(undefined);

  const setEsQuery = useCallback((q: ServiceMapEsQuery | undefined) => {
    setEsQueryState(q);
  }, []);

  const value = useMemo(() => ({ esQuery, setEsQuery }), [esQuery, setEsQuery]);

  return (
    <ServiceMapSearchContext.Provider value={value}>{children}</ServiceMapSearchContext.Provider>
  );
}

export function useServiceMapSearchContext() {
  return useContext(ServiceMapSearchContext);
}
