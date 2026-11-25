/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

interface ServiceMapGroupActionsContextValue {
  closeGroup?: (groupId: string) => void;
}

const ServiceMapGroupActionsContext = createContext<ServiceMapGroupActionsContextValue>({});

/**
 * Lets the box of an open service group close itself. The state of which groups are open lives above
 * the graph (see `useServiceMapClosedGroups`), so the node asks for it through context instead of
 * carrying a callback in its data.
 */
export function ServiceMapGroupActionsProvider({
  children,
  closeGroup,
}: {
  children: ReactNode;
  closeGroup?: (groupId: string) => void;
}) {
  const value = useMemo(() => ({ closeGroup }), [closeGroup]);
  return (
    <ServiceMapGroupActionsContext.Provider value={value}>
      {children}
    </ServiceMapGroupActionsContext.Provider>
  );
}

/** Closes the open group with the given id; `undefined` when the map cannot close groups. */
export function useServiceMapCloseGroup(): ((groupId: string) => void) | undefined {
  return useContext(ServiceMapGroupActionsContext).closeGroup;
}
