/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
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
  onBeforeClose?: ConsoleRegistrationInterface['onBeforeClose'];
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

export const ConsoleManager = memo<ConsoleManagerProps>(({ storage = {}, children }) => {
  const [consoleStorage, setConsoleStorage] = useState<RunningConsoleStorage>(storage);

  const show = useCallback<ConsoleManagerClient['show']>((id) => {
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
  }, []);

  const hide = useCallback<ConsoleManagerClient['hide']>((id) => {
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
  }, []);

  const terminate = useCallback<ConsoleManagerClient['terminate']>((id) => {
    setConsoleStorage((prevState) => {
      if (!prevState[id]) {
        throw new Error(`Unable to terminate console id ${id}. Not found`);
      }

      const { onBeforeClose } = prevState[id];

      if (onBeforeClose) {
        onBeforeClose();
      }

      const newState = { ...prevState };
      delete newState[id];

      return newState;
    });
  }, []);

  const getOne = useCallback<ConsoleManagerClient['getOne']>(
    (id) => {
      if (consoleStorage[id]) {
        return consoleStorage[id].client;
      }
    },
    [consoleStorage]
  );

  const getList = useCallback<ConsoleManagerClient['getList']>(() => {
    return Object.values(consoleStorage).map((managedConsole) => managedConsole.client);
  }, [consoleStorage]);

  const register = useCallback<ConsoleManagerClient['register']>(
    ({ id, title, ...otherRegisterProps }) => {
      const managedConsole: ManagedConsole = {
        ...otherRegisterProps,
        client: {
          id,
          title,
          show: () => show(id),
          hide: () => hide(id),
          terminate: () => terminate(id),
        },
        console: <></>, // temporary
        isOpen: false,
        key: Symbol(id),
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

      managedConsole.console = (
        <Console {...managedConsole.consoleProps} managedKey={managedConsole.key} />
      );

      return managedConsole.client;
    },
    [hide, show, terminate]
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
