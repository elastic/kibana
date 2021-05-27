/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface MainNavigationVisibilityState {
  isCollapsed: boolean;
  updateCollapsedState: Dispatch<SetStateAction<boolean>>;
}

const MainNavigationVisibilityContext = createContext<MainNavigationVisibilityState>({
  isCollapsed: false,
  updateCollapsedState: () => {},
});

interface MainNavigationVisibilityProviderProps {
  children: React.ReactNode;
}

export const MainNavigationVisibilityProvider = ({
  children,
}: MainNavigationVisibilityProviderProps) => {
  const [isCollapsed, updateCollapsedState] = useState(false);

  const contextValue = useMemo(() => ({ isCollapsed, updateCollapsedState }), [isCollapsed]);

  return (
    <MainNavigationVisibilityContext.Provider value={contextValue}>
      {children}
    </MainNavigationVisibilityContext.Provider>
  );
};

export const useMainNavigationVisibility = () => useContext(MainNavigationVisibilityContext);
