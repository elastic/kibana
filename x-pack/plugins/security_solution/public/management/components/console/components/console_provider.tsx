/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useContext } from 'react';
import { ConsoleServiceInterface } from '../service/console_service';

const ConsoleContext = React.createContext<null | ConsoleServiceInterface>(null);

export type ConsoleProviderProps = PropsWithChildren<{
  service: ConsoleServiceInterface;
}>;

export const ConsoleProvider = memo<ConsoleProviderProps>(({ service, children }) => {
  return <ConsoleContext.Provider value={service}>{children}</ConsoleContext.Provider>;
});

ConsoleProvider.displayName = 'ConsoleProvider';

export type ConsoleProviderComponent = typeof ConsoleProvider;

export const useConsoleService = <T extends ConsoleServiceInterface>(): T => {
  const consoleService = useContext(ConsoleContext);

  if (!consoleService) {
    throw new Error(`ConsoleProvider not defined`);
  }

  return consoleService as T;
};
