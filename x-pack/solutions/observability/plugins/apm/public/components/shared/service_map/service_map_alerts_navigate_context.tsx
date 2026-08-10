/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

export type ServiceMapAlertsNavigateHandler = (e: MouseEvent | KeyboardEvent) => void;

/**
 * Factory that returns a per-service alerts-tab navigate handler.
 *
 * Modeled as a factory (rather than a single direct callback like the SLO
 * flyout context) because the provider's underlying hooks
 * (`useApmRouter`, `useAnyOfApmParams`, ...) are route-dependent and must be
 * called once at the map level — not per node — to stay compliant with the
 * Rules of Hooks. The factory closes over those values and returns a fresh
 * callback for each `serviceName` the shared `ServiceNode` asks about.
 */
export type MakeAlertsNavigateHandler = (
  serviceName: string
) => ServiceMapAlertsNavigateHandler | undefined;

interface ServiceMapAlertsNavigateContextValue {
  makeAlertsNavigateHandler?: MakeAlertsNavigateHandler;
}

const ServiceMapAlertsNavigateContext = createContext<ServiceMapAlertsNavigateContextValue>({});

export function ServiceMapAlertsNavigateProvider({
  children,
  makeAlertsNavigateHandler,
}: {
  children: ReactNode;
  makeAlertsNavigateHandler: MakeAlertsNavigateHandler;
}) {
  const value = useMemo(() => ({ makeAlertsNavigateHandler }), [makeAlertsNavigateHandler]);
  return (
    <ServiceMapAlertsNavigateContext.Provider value={value}>
      {children}
    </ServiceMapAlertsNavigateContext.Provider>
  );
}

export function useServiceMapAlertsNavigate(
  serviceName: string
): ServiceMapAlertsNavigateHandler | undefined {
  const { makeAlertsNavigateHandler } = useContext(ServiceMapAlertsNavigateContext);
  // Memoize the per-service handler so each `ServiceNode` receives a stable
  // callback identity across renders, as long as the upstream factory and
  // service name don't change.
  return useMemo(
    () => makeAlertsNavigateHandler?.(serviceName),
    [makeAlertsNavigateHandler, serviceName]
  );
}
