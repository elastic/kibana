/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { EuiModal, EuiModalBody } from '@elastic/eui';
import { ConsoleProviderComponent } from '../console';

interface ConsoleManagement {
  openConsole(console: ConsoleProviderComponent): void;
  hideConsole(console: ConsoleProviderComponent): void;
  closeConsole(console: ConsoleProviderComponent): void;
}

const RunningConsoleManagementContext = React.createContext<ConsoleManagement | null>(null);

/**
 * Provides methods for showing, hidding (running in the background) and closing Consoles
 */
export const RunningConsoleManagementProvider = memo(({ children }) => {
  const [consoles, setConsoles] = useState<
    Map<ConsoleProviderComponent, { show: boolean; title: ReactNode }>
  >(new Map());
  const openConsole = useCallback(() => {}, []);
  const hideConsole = useCallback(() => {}, []);
  const closeConsole = useCallback(() => {}, []);

  const consoleManagement = useMemo(() => {
    return {
      openConsole,
      hideConsole,
      closeConsole,
    };
  }, [closeConsole, hideConsole, openConsole]);

  const visibleConsoles = useMemo(() => {
    const dialogs = [];

    for (const [console, options] of consoles.entries()) {
      if (options.show) {
        dialogs.push(
          <EuiModal onClose={() => {}}>
            <EuiModalBody>{console}</EuiModalBody>
          </EuiModal>
        );
      }
    }

    return dialogs;
  }, [consoles]);

  return (
    <RunningConsoleManagementContext.Provider value={consoleManagement}>
      {children}
    </RunningConsoleManagementContext.Provider>
  );
});

RunningConsoleManagementProvider.displayName = 'RunningConsoleManagementProvider';

export const useRunningConsoleManagement = (): ConsoleManagement => {
  const consoleManagement = useContext(RunningConsoleManagementContext);

  if (!consoleManagement) {
    throw new Error('No RunningConsoleManagementContext found!');
  }

  return consoleManagement;
};
