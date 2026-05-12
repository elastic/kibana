/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

export type ServiceMapAlertsNavigateHandler = (e: MouseEvent | KeyboardEvent) => void;

export type GetAlertsNavigateHandler = (
  serviceName: string
) => ServiceMapAlertsNavigateHandler | undefined;

interface ServiceMapAlertsNavigateContextValue {
  getAlertsNavigateHandler?: GetAlertsNavigateHandler;
}

const ServiceMapAlertsNavigateContext = createContext<ServiceMapAlertsNavigateContextValue>({});

export function ServiceMapAlertsNavigateProvider({
  children,
  getAlertsNavigateHandler,
}: {
  children: ReactNode;
  getAlertsNavigateHandler: GetAlertsNavigateHandler;
}) {
  const value = useMemo(() => ({ getAlertsNavigateHandler }), [getAlertsNavigateHandler]);
  return (
    <ServiceMapAlertsNavigateContext.Provider value={value}>
      {children}
    </ServiceMapAlertsNavigateContext.Provider>
  );
}

export function useServiceMapAlertsNavigate(
  serviceName: string
): ServiceMapAlertsNavigateHandler | undefined {
  const { getAlertsNavigateHandler } = useContext(ServiceMapAlertsNavigateContext);
  return useMemo(
    () => getAlertsNavigateHandler?.(serviceName),
    [getAlertsNavigateHandler, serviceName]
  );
}
