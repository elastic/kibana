/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  memo,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Immutable } from '../../../../common/endpoint/types';
import { ConsolePopup } from './components/console_popup';

interface ConsoleRegistrationInterface {
  id: string;
  title: ReactNode;
  consoleProps: Record<string, unknown>; // FIXME:PT Use console props here once merged
  onBeforeClose?: () => Promise<void>;
}

interface RegisteredConsoleClient extends Pick<ConsoleRegistrationInterface, 'id' | 'title'> {
  show(): void;
  hide(): void;
  terminate(): void;
}

interface ManagedConsole {
  client: RegisteredConsoleClient;
  consoleProps: ConsoleRegistrationInterface['consoleProps'];
  console: JSX.Element; // actual console component
  isOpen: boolean;
  onBeforeClose?: ConsoleRegistrationInterface['onBeforeClose'];
}

interface ConsoleManagerClient {
  /** Registers a new console */
  register(console: ConsoleRegistrationInterface): Immutable<RegisteredConsoleClient>;
  /** Opens console in a dialog */
  show(id: string): void;
  /** Hides the console (minimize) */
  hide(id: string): void;
  /** Removes the console from management and calls `onBeforeClose` if one was defined */
  terminate(id: string): void;
  /** Retrieve a running console */
  getOne(id: string): Immutable<RegisteredConsoleClient> | undefined;
  /** Get a list of running consoles */
  getList(): Immutable<RegisteredConsoleClient[]>;
}

type RunningConsoleStorage = Record<string, ManagedConsole>;

const ConsoleManagerContext = React.createContext<ConsoleManagerClient | undefined>(undefined);

export type ConsoleManagerProps = PropsWithChildren<{
  storage?: RunningConsoleStorage;
}>;

export const ConsoleManager = memo<ConsoleManagerProps>(({ storage = {}, children }) => {
  const [consoleStorage, setConsoleStorage] = useState<RunningConsoleStorage>(storage);

  const consoleManagerClient = useMemo<ConsoleManagerClient>(() => {
    const show: ConsoleManagerClient['show'] = (id) => {
      setConsoleStorage((prevState) => {
        if (!prevState[id]) {
          throw new Error(`Unable to show Console with id ${id}. Not found.`);
        }

        const newState = { ...prevState };

        // if any is visible, hide it
        Object.entries(newState).forEach(([consoleId, managedConsole]) => {
          if (managedConsole.isOpen) {
            newState[consoleId] = {
              ...managedConsole,
              isOpen: false,
            };
          }
        });

        newState[id] = {
          ...newState[id],
          isOpen: true,
        };

        return newState;
      });
    };

    const hide: ConsoleManagerClient['hide'] = (id) => {
      setConsoleStorage((prevState) => {
        if (!prevState[id]) {
          throw new Error(`Unable to hide Console with id ${id}. Not found.`);
        }

        return {
          ...prevState,
          [id]: {
            ...prevState[id],
            isOpen: false,
          },
        };
      });
    };

    const terminate: ConsoleManagerClient['terminate'] = () => {};

    const getOne: ConsoleManagerClient['getOne'] = () => {};

    const getList: ConsoleManagerClient['getList'] = () => {};

    const register: ConsoleManagerClient['register'] = ({ id, title, ...otherRegisterProps }) => {
      const managedConsole: ManagedConsole = {
        ...otherRegisterProps,
        client: {
          id,
          title,
          show: () => show(id),
          hide: () => hide(id),
          terminate: () => terminate(id),
        },
        console: <div>{'console component here'}</div>,
        isOpen: false,
      };

      setConsoleStorage((prevState) => {
        if (prevState[id]) {
          throw new Error(`Console with id ${id} already registered.`);
        }

        return {
          ...prevState,
          [id]: managedConsole,
        };
      });

      return managedConsole.client;
    };

    return {
      register,
      show,
      hide,
      terminate,
      getOne,
      getList,
    };
  }, []);

  const visibleConsole = useMemo(() => {
    return Object.values(consoleStorage).find((managedConsole) => managedConsole.isOpen);
  }, [consoleStorage]);

  const handleOnTerminate = useCallback(() => {
    // FIXME:PT implement
  }, []);

  const handleOnHide = useCallback(() => {
    // FIXME:PT implement
  }, []);

  const runningConsoles = useMemo(() => {
    return Object.values(consoleStorage).map((managedConsole) => managedConsole.console);
  }, [consoleStorage]);

  // TODO: might need to have registration process provide the input for the Console, so that we can control "show/hide" and not lose console content
  // TODO: Console may need to interact with this manager in order to determine if its a managed or non-managed console

  return (
    <ConsoleManagerContext.Provider value={consoleManagerClient}>
      {children}

      <ConsolePopup
        title={visibleConsole?.client.title ?? null}
        isHidden={!visibleConsole}
        onTerminate={handleOnTerminate}
        onHide={handleOnHide}
      >
        {runningConsoles}
      </ConsolePopup>
    </ConsoleManagerContext.Provider>
  );
});
ConsoleManager.displayName = 'ConsoleManager';

export const useConsoleManager = (): ConsoleManagerClient => {
  const consoleManager = useContext(ConsoleManagerContext);

  if (!consoleManager) {
    throw new Error('ConsoleManagerContext not found');
  }

  return consoleManager;
};
