/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type FC } from 'react';
import { useSyncFlyoutStateWithUrl } from '../hooks/url/use_sync_flyout_state_with_url';

export type SecuritySolutionFlyoutCloseContextValue = ReturnType<typeof useSyncFlyoutStateWithUrl>;

export const SecuritySolutionFlyoutCloseContext = createContext<
  SecuritySolutionFlyoutCloseContextValue | undefined
>(undefined);

/**
 * Exposes the flyout close context value (returned from syncUrl) as a hook.
 */
export const useSecurityFlyoutUrlSync = () => {
  const contextValue = useContext(SecuritySolutionFlyoutCloseContext);

  if (!contextValue) {
    throw new Error('useSecurityFlyoutUrlSync can only be used inside respective provider');
  }

  return contextValue;
};

/**
 * Provides urlSync hook return value as a context value, for reuse in other components.
 * Main goal here is to avoid calling useSyncFlyoutStateWithUrl multiple times.
 */
export const SecuritySolutionFlyoutUrlSyncProvider: FC = ({ children }) => {
  const [flyoutRef, handleFlyoutChangedOrClosed] = useSyncFlyoutStateWithUrl();

  const value: SecuritySolutionFlyoutCloseContextValue = useMemo(
    () => [flyoutRef, handleFlyoutChangedOrClosed],
    [flyoutRef, handleFlyoutChangedOrClosed]
  );

  return (
    <SecuritySolutionFlyoutCloseContext.Provider value={value}>
      {children}
    </SecuritySolutionFlyoutCloseContext.Provider>
  );
};
