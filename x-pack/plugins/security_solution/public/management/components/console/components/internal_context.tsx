/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

export interface InternalServices {
  scrollDown(): void;
}

export const ConsoleInternalContext = createContext<InternalServices | null>(null);

export const useInternalServices = (): InternalServices => {
  const internalContext = useContext(ConsoleInternalContext);

  if (!internalContext) {
    throw new Error(`ConsoleInternalContext not found!`);
  }

  return internalContext;
};
