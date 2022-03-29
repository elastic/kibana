/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  memo,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ConsolePopup } from './components/console_popup';
import {
  ConsoleManagerClient,
  ConsoleRegistrationInterface,
  RegisteredConsoleClient,
} from './types';
import { Console } from '../../console';

interface ManagedConsole {
  client: RegisteredConsoleClient;
  consoleProps: ConsoleRegistrationInterface['consoleProps'];
  console: JSX.Element; // actual console component
  isOpen: boolean;
  key: symbol;
  onBeforeTerminate?: ConsoleRegistrationInterface['onBeforeTerminate'];
}

type RunningConsoleStorage = Record<string, ManagedConsole>;

interface ConsoleManagerInternalClient {
  /**
   * Returns the managed console record for the given ConsoleProps object if its being managed
   * @param key
   */
  getManagedConsole(key: ManagedConsole['key']): ManagedConsole | undefined;
}

interface ConsoleManagerContextClients {
  client: ConsoleManagerClient;
  internal: ConsoleManagerInternalClient;
}

const ConsoleManagerContext = React.createContext<ConsoleManagerContextClients | undefined>(
  undefined
);

export type ConsoleManagerProps = PropsWithChildren<{
  storage?: RunningConsoleStorage;
}>;

/**
 * A console management context. Allow for the show/hide of consoles without them loosing their
 * command history while running in "hidden" mode.
 */
export const ConsoleManager = memo<ConsoleManagerProps>(({ storage = {}, children }) => {
  const [consoleStorage, setConsoleStorage] = useState<RunningConsoleStorage>(storage);

  // `consoleStorageRef` keeps a copy (reference) to the latest copy of the `consoleStorage` so that
  // some exposed methods (ex. `RegisteredConsoleClient`) are guaranteed to be immutable and function
  // as expected between state updates without having to re-update every record stored in the `ConsoleStorage`
  const consoleStorageRef = useRef<RunningConsoleStorage>();
  consoleStorageRef.current = consoleStorage;

  const validateIdOrThrow = useCallback((id: string) => {
    if (!consoleStorageRef.current?.[id]) {
      throw new Error(`Console with id ${id} not found`);
    }
  }, []); // << IMPORTANT: this callback should have no dependencies

  const show = useCallback<ConsoleManagerClient['show']>(
    (id) => {
      validateIdOrThrow(id);

      setConsoleStorage((prevState) => {
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
    },
    [validateIdOrThrow] // << IMPORTANT: this callback should have immutable dependencies
  );

  const hide = useCallback<ConsoleManagerClient['hide']>(
    (id) => {
      validateIdOrThrow(id);

      setConsoleStorage((prevState) => {
        return {
          ...prevState,
          [id]: {
            ...prevState[id],
            isOpen: false,
          },
        };
      });
    },
    [validateIdOrThrow] // << IMPORTANT: this callback should have immutable dependencies
  );

  const terminate = useCallback<ConsoleManagerClient['terminate']>(
    (id) => {
      validateIdOrThrow(id);

      setConsoleStorage((prevState) => {
        const { onBeforeTerminate } = prevState[id];

        if (onBeforeTerminate) {
          onBeforeTerminate();
        }

        const newState = { ...prevState };
        delete newState[id];

        return newState;
      });
    },
    [validateIdOrThrow] // << IMPORTANT: this callback should have immutable dependencies
  );

  const getOne = useCallback<ConsoleManagerClient['getOne']>(
    <Meta extends object = Record<string, unknown>>(id: string) => {
      if (consoleStorageRef.current?.[id]) {
        return consoleStorageRef.current[id].client as Readonly<RegisteredConsoleClient<Meta>>;
      }
    },
    [] // << IMPORTANT: this callback should have dependencies or only immutable dependencies
  );

  const getList = useCallback<ConsoleManagerClient['getList']>(<
    Meta extends object = Record<string, unknown>
  >() => {
    return Object.values(consoleStorage).map(
      (managedConsole) => managedConsole.client
    ) as ReadonlyArray<Readonly<RegisteredConsoleClient<Meta>>>;
  }, [consoleStorage]); // << This callack should always use `consoleStorage`

  const isVisible = useCallback((id: string): boolean => {
    if (consoleStorageRef.current?.[id]) {
      return consoleStorageRef.current[id].isOpen;
    }

    return false;
  }, []); // << IMPORTANT: this callback should have no dependencies

  const register = useCallback<ConsoleManagerClient['register']>(
    ({ id, title, meta, consoleProps, ...otherRegisterProps }) => {
      if (consoleStorage[id]) {
        throw new Error(`Console with id ${id} already registered`);
      }

      const managedKey = Symbol(id);
      const managedConsole: ManagedConsole = {
        ...otherRegisterProps,
        client: {
          id,
          title,
          meta,
          // Referencing/using the interface methods here (defined in the outer scope of this function)
          // is ok because those are immutable and thus will not change between state changes
          show: () => show(id),
          hide: () => hide(id),
          terminate: () => terminate(id),
          isVisible: () => isVisible(id),
        },
        consoleProps,
        console: <Console {...consoleProps} managedKey={managedKey} key={id} />,
        isOpen: false,
        key: managedKey,
      };

      setConsoleStorage((prevState) => {
        return {
          ...prevState,
          [id]: managedConsole,
        };
      });

      return managedConsole.client;
    },
    [consoleStorage, hide, isVisible, show, terminate]
  );

  const consoleManagerClient = useMemo<ConsoleManagerClient>(() => {
    return {
      register,
      show,
      hide,
      terminate,
      getOne,
      getList,
    };
  }, [getList, getOne, hide, register, show, terminate]);

  const consoleManageContextClients = useMemo<ConsoleManagerContextClients>(() => {
    return {
      client: consoleManagerClient,
      internal: {
        getManagedConsole(key): ManagedConsole | undefined {
          return Object.values(consoleStorage).find((managedConsole) => managedConsole.key === key);
        },
      },
    };
  }, [consoleManagerClient, consoleStorage]);

  const visibleConsole = useMemo(() => {
    return Object.values(consoleStorage).find((managedConsole) => managedConsole.isOpen);
  }, [consoleStorage]);

  const handleOnTerminate = useCallback(() => {
    if (visibleConsole) {
      consoleManagerClient.terminate(visibleConsole.client.id);
    }
  }, [consoleManagerClient, visibleConsole]);

  const handleOnHide = useCallback(() => {
    if (visibleConsole) {
      consoleManagerClient.hide(visibleConsole.client.id);
    }
  }, [consoleManagerClient, visibleConsole]);

  const runningConsoles = useMemo(() => {
    return Object.values(consoleStorage).map((managedConsole) => managedConsole.console);
  }, [consoleStorage]);

  return (
    <ConsoleManagerContext.Provider value={consoleManageContextClients}>
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

/**
 * Returns the interface for managing consoles withing a `<ConsoleManager/>` constext.
 */
export const useConsoleManager = (): ConsoleManagerClient => {
  const consoleManagerClients = useContext(ConsoleManagerContext);

  if (!consoleManagerClients) {
    throw new Error('ConsoleManagerContext not found');
  }

  return consoleManagerClients.client;
};

/**
 * For internal use within Console code only!
 * Hook will return the `ManagedConsole` interface stored in the manager if it finds
 * the `ConsoleProps` provided on input to be one that the ConsoleManager is tracking.
 *
 * @protected
 */
export const useWithManagedConsole = (
  key: ManagedConsole['key'] | undefined
): ManagedConsole | undefined => {
  const consoleManagerClients = useContext(ConsoleManagerContext);

  if (key && consoleManagerClients) {
    return consoleManagerClients.internal.getManagedConsole(key);
  }
};
