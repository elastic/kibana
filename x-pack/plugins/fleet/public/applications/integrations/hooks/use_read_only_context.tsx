/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

const ReadOnlyContext = createContext<{ isReadOnly: boolean; setIsReadOnly: (v: boolean) => void }>(
  { isReadOnly: false, setIsReadOnly: () => {} }
);

export const ReadOnlyContextProvider: React.FC = ({ children }) => {
  const [isReadOnly, setIsReadOnly] = useState(false);
  return (
    <ReadOnlyContext.Provider
      value={{
        isReadOnly,
        setIsReadOnly,
      }}
    >
      {children}
    </ReadOnlyContext.Provider>
  );
};

export function useIsReadOnly() {
  const context = useContext(ReadOnlyContext);
  return context.isReadOnly;
}

export function useSetIsReadOnly(isReadOnly: boolean) {
  const context = useContext(ReadOnlyContext);
  useEffect(() => {
    context.setIsReadOnly(true);
    return () => context.setIsReadOnly(false);
  }, [context]);
}
