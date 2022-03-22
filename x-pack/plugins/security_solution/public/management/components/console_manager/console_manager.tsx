/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, ReactNode } from 'react';

interface ConsoleRegistrationInterface {
  id: string;
  title: ReactNode;
  console: JSX.Element;
  onBeforeClose?: () => Promise<void>;
}

interface RunningConsole extends Pick<ConsoleRegistrationInterface, 'id' | 'title' | 'console'> {
  open(): void;
  hide(): void;
  terminate(): void;
}

interface ConsoleManagerInterface {
  register(console: ConsoleRegistrationInterface): RunningConsole;
  /** Opens console in a dialog */
  open(id: string): void;
  /** Hides the console (minimize) */
  hide(id: string): void;
  /** Removes the console from management and calls `onBeforeClose` if one was defined */
  terminate(id: string): void;
  /** Retrieve a running console */
  getOne(id: string): RunningConsole | undefined;
  /** Get a list of running consoles */
  getList(): RunningConsole[];
}

type RunningConsoleStorage = Record<string, RunningConsole>;

const ConsoleManagerContext = React.createContext<ConsoleManagerInterface | undefined>(undefined);

export type ConsoleManagerProps = PropsWithChildren<{
  storage?: RunningConsoleStorage;
}>;

export const ConsoleManager = memo<ConsoleManagerProps>(({ storage, children }) => {
  const managementInterface = {};

  // TODO: might need to have registration process provide the input for the Console, so that we can control "show/hide" and not lose console content

  return (
    <ConsoleManagerContext.Provider value={managementInterface}>
      {children}
    </ConsoleManagerContext.Provider>
  );
});
ConsoleManager.displayName = 'ConsoleManager';

export const useConsoleManager = (): ConsoleManagerInterface => {
  // FIXME:PT implement
};
