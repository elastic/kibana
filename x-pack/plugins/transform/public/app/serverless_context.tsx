/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useContext, useMemo } from 'react';

export const ServerlessContext = createContext({
  isServerless: false,
});

export const ServerlessContextProvider: FC<{ isServerless: boolean }> = (props) => {
  const { children, isServerless } = props;
  return (
    <ServerlessContext.Provider value={{ isServerless }}>{children}</ServerlessContext.Provider>
  );
};

export function useIsServerless() {
  const context = useContext(ServerlessContext);
  return useMemo(() => {
    return context.isServerless;
  }, [context]);
}
