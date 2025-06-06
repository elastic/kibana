/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface InitialMessageContextValue {
  initialMessage: string | null;
  setInitialMessage: (message: string | null) => void;
  clearInitialMessage: () => void;
}

const InitialMessageContext = createContext<InitialMessageContextValue | undefined>(undefined);

export const InitialMessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  const clearInitialMessage = useCallback(() => {
    setInitialMessage(null);
  }, []);

  return (
    <InitialMessageContext.Provider
      value={{
        initialMessage,
        setInitialMessage,
        clearInitialMessage,
      }}
    >
      {children}
    </InitialMessageContext.Provider>
  );
};

export const useInitialMessage = () => {
  const context = useContext(InitialMessageContext);
  if (!context) {
    throw new Error('useInitialMessage must be used within an InitialMessageProvider');
  }
  return context;
};
