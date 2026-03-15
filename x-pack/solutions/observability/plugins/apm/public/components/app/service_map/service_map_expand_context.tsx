/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

export interface ServiceMapExpandContextValue {
  /** Set of service IDs currently included in the kuery (expanded). */
  expandedServiceIds: Set<string>;
  /** Set of service node IDs that have at least one connection (edge). Only these show +/-. */
  serviceIdsWithConnections: Set<string>;
  onExpandService: (serviceId: string) => void;
  onCollapseService: (serviceId: string) => void;
}

const ServiceMapExpandContext = createContext<ServiceMapExpandContextValue | null>(null);

export function useServiceMapExpand(): ServiceMapExpandContextValue | null {
  return useContext(ServiceMapExpandContext);
}

export const ServiceMapExpandProvider = ServiceMapExpandContext.Provider;

export function useIsServiceExpanded(serviceId: string): boolean {
  const ctx = useServiceMapExpand();
  return ctx?.expandedServiceIds.has(serviceId) ?? false;
}
