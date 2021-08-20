/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSuperSelect,
} from '@elastic/eui';

interface ConsoleManagement {
  openConsole(id: string, options: { title: ReactNode; console: JSX.Element }): void;
  hideConsole(id: string): void;
  closeConsole(id: string): void;
  consoleCount: number;
  getConsoleSelectorElement(): JSX.Element;
}

const RunningConsoleManagementContext = React.createContext<ConsoleManagement | null>(null);

/**
 * Provides methods for showing, hidding (running in the background) and closing Consoles
 */
export const RunningConsoleManagementProvider = memo(({ children }) => {
  const [consoles, setConsoles] = useState<
    Record<string, { show: boolean; title: ReactNode; console: JSX.Element }>
  >({});

  const openConsole = useCallback<ConsoleManagement['openConsole']>((id, options) => {
    setConsoles((prevState) => {
      const newState = { ...prevState };
      newState[id] = {
        ...(prevState[id] || { show: true, title: '', console: options.console }),
        ...options,
        ...{ show: true },
      };
      return newState;
    });
  }, []);

  const hideConsole = useCallback<ConsoleManagement['hideConsole']>((id) => {
    setConsoles((prevState) => {
      if (prevState[id] && prevState[id].show) {
        return {
          ...prevState,
          ...{ [id]: { ...prevState[id], show: false } },
        };
      }

      return prevState;
    });
  }, []);

  const closeConsole = useCallback<ConsoleManagement['closeConsole']>(() => {}, []);

  const getConsoleSelectorElement = useCallback<
    ConsoleManagement['getConsoleSelectorElement']
  >(() => {
    const options = Object.entries(consoles).map(([id, opt]) => {
      return {
        value: id,
        inputDisplay: opt.title,
      };
    });
    return (
      <EuiSuperSelect
        options={options}
        valueOfSelected={''}
        onChange={(id) => openConsole(id, consoles[id])}
      />
    );
  }, [consoles, openConsole]);

  const consoleCount = useMemo(() => {
    return Object.keys(consoles).length;
  }, [consoles]);

  const consoleManagement = useMemo(() => {
    return {
      openConsole,
      hideConsole,
      closeConsole,
      consoleCount,
      getConsoleSelectorElement,
    };
  }, [closeConsole, consoleCount, getConsoleSelectorElement, hideConsole, openConsole]);

  const visibleConsoles = useMemo(() => {
    const dialogs = [];

    for (const [id, { show, console, title }] of Object.entries(consoles)) {
      if (show) {
        dialogs.push(
          <EuiModal onClose={() => hideConsole(id)}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <h1>{title}</h1>
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>{console}</EuiModalBody>
          </EuiModal>
        );
      }
    }

    return dialogs;
  }, [consoles, hideConsole]);

  return (
    <RunningConsoleManagementContext.Provider value={consoleManagement}>
      {children}
      {visibleConsoles}
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
