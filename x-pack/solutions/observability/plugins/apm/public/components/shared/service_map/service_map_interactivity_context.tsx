/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type ReactNode } from 'react';

// Defaults to interactive so consumers that render ServiceNode without wrapping this
// provider (e.g. the Agent Builder service map attachment) keep their existing behavior.
const ServiceMapInteractivityContext = createContext<boolean>(true);

export function ServiceMapInteractivityProvider({
  children,
  isInteractive,
}: {
  children: ReactNode;
  isInteractive: boolean;
}) {
  return (
    <ServiceMapInteractivityContext.Provider value={isInteractive}>
      {children}
    </ServiceMapInteractivityContext.Provider>
  );
}

export function useServiceMapInteractivity() {
  return useContext(ServiceMapInteractivityContext);
}
