/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ConsoleDataState } from '../console_state/types';
import { ConsolePageOverlay } from './components/console_page_overlay';
import type {
  ConsoleManagerClient,
  ConsoleRegistrationInterface,
  RegisteredConsoleClient,
} from './types';
import { Console } from '../../console';

interface ManagedConsole
  extends Pick<
    ConsoleRegistrationInterface,
    | 'consoleProps'
    | 'PageTitleComponent'
    | 'PageBodyComponent'
    | 'ActionComponents'
    | 'showCloseButton'
  > {
  client: RegisteredConsoleClient;
  console: JSX.Element; // actual console component
  isOpen: boolean;
  key: symbol;
}

type RunningConsoleStorage = Record<string, ManagedConsole>;

interface ConsoleManagerInternalClient {
  /**
   * Returns the managed console record for the given ConsoleProps object if its being managed
   * @param key
   */
  getManagedConsole(key: ManagedConsole['key']): ManagedConsole | undefined;

  /** Returns the Console's internal state (if any) */
  getManagedConsoleState(key: ManagedConsole['key']): ConsoleDataState | undefined;

  /** Stores the console's internal state */
  storeManagedConsoleState(key: ManagedConsole['key'], state: ConsoleDataState): void;
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
  const [consoleStateStorage] = useState(new Map<ManagedConsole['key'], ConsoleDataState>());

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
    [validateIdOrThrow] // << IMPORTANT: this callback should have only immutable dependencies
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
    [validateIdOrThrow] // << IMPORTANT: this callback should have only immutable dependencies
  );

  const terminate = useCallback<ConsoleManagerClient['terminate']>(
    (id) => {
      validateIdOrThrow(id);

      setConsoleStorage((prevState) => {
        const newState = { ...prevState };
        delete newState[id];

        return newState;
      });
    },
    [validateIdOrThrow] // << IMPORTANT: this callback should have only immutable dependencies
  );

  const getOne = useCallback<ConsoleManagerClient['getOne']>(
    <Meta extends object = Record<string, unknown>>(id: string) => {
      if (consoleStorageRef.current?.[id]) {
        return consoleStorageRef.current[id].client as Readonly<RegisteredConsoleClient<Meta>>;
      }
    },
    [] // << IMPORTANT: this callback should have no dependencies or only immutable dependencies
  );

  const getList = useCallback<ConsoleManagerClient['getList']>(<
    Meta extends object = Record<string, unknown>
  >() => {
    return Object.values(consoleStorage).map(
      (managedConsole) => managedConsole.client
    ) as ReadonlyArray<Readonly<RegisteredConsoleClient<Meta>>>;
  }, [consoleStorage]); // << This callback should always use `consoleStorage`

  const isVisible = useCallback((id: string): boolean => {
    if (consoleStorageRef.current?.[id]) {
      return consoleStorageRef.current[id].isOpen;
    }

    return false;
  }, []); // << IMPORTANT: this callback should have no dependencies

  const register = useCallback<ConsoleManagerClient['register']>(
    ({ id, meta, consoleProps, ...otherRegisterProps }) => {
      if (consoleStorage[id]) {
        throw new Error(`Console with id ${id} already registered`);
      }

      const managedKey = Symbol(id);
      // Referencing/using the interface methods here (defined in the outer scope of this function)
      // is ok because those are immutable and thus will not change between state changes
      const showThisConsole = show.bind(null, id);
      const hideThisConsole = hide.bind(null, id);
      const terminateThisConsole = terminate.bind(null, id);
      const isThisConsoleVisible = isVisible.bind(null, id);

      const managedConsole: ManagedConsole = {
        PageBodyComponent: undefined,
        PageTitleComponent: undefined,
        ActionComponents: undefined,
        ...otherRegisterProps,
        client: {
          id,
          meta,
          // The use of `setTimeout()` below is needed because this client interface can be consumed
          // prior to the component state being updated. Placing a delay on the execution of these
          // methods allows for state to be updated first and then the action is applied.
          // So someone can do: `.register({...}).show()` and it will work
          show: () => {
            setTimeout(showThisConsole, 0);
          },
          hide: () => {
            setTimeout(hideThisConsole, 0);
          },
          terminate: () => {
            setTimeout(terminateThisConsole, 0);
          },
          isVisible: () => isThisConsoleVisible(),
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

        getManagedConsoleState(key: ManagedConsole['key']): ConsoleDataState | undefined {
          return consoleStateStorage.get(key);
        },

        storeManagedConsoleState(key: ManagedConsole['key'], state: ConsoleDataState) {
          consoleStateStorage.set(key, state);
        },
      },
    };
  }, [consoleManagerClient, consoleStateStorage, consoleStorage]);

  const visibleConsole = useMemo(() => {
    return Object.values(consoleStorage).find((managedConsole) => managedConsole.isOpen);
  }, [consoleStorage]);

  const visibleConsoleMeta = useMemo(() => {
    return visibleConsole?.client.meta ?? {};
  }, [visibleConsole?.client.meta]);

  const handleOnHide = useCallback(() => {
    if (visibleConsole) {
      consoleManagerClient.hide(visibleConsole.client.id);
    }
  }, [consoleManagerClient, visibleConsole]);

  return (
    <ConsoleManagerContext.Provider value={consoleManageContextClients}>
      {children}

      {visibleConsole && (
        <ConsolePageOverlay
          onHide={handleOnHide}
          console={
            <Console
              {...visibleConsole.consoleProps}
              managedKey={visibleConsole.key}
              key={visibleConsole.client.id}
            />
          }
          isHidden={!visibleConsole}
          pageTitle={
            visibleConsole.PageTitleComponent && (
              <visibleConsole.PageTitleComponent meta={visibleConsoleMeta} />
            )
          }
          body={
            visibleConsole.PageBodyComponent && (
              <visibleConsole.PageBodyComponent meta={visibleConsoleMeta} />
            )
          }
          actions={
            visibleConsole.ActionComponents &&
            visibleConsole.ActionComponents.map((ActionComponent) => {
              return <ActionComponent meta={visibleConsoleMeta} />;
            })
          }
          showCloseButton={visibleConsole.showCloseButton}
        />
      )}
    </ConsoleManagerContext.Provider>
  );
});
ConsoleManager.displayName = 'ConsoleManager';

/**
 * Returns the interface for managing consoles withing a `<ConsoleManager/>` context.
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

type WithManagedConsoleState = Readonly<
  [
    getState: undefined | (() => ConsoleDataState | undefined),
    storeState: undefined | ((state: ConsoleDataState) => void)
  ]
>;
/**
 * Provides methods for retrieving/storing a console's internal state (if any)
 * @param key
 */
export const useWithManagedConsoleState = (
  key: ManagedConsole['key'] | undefined
): WithManagedConsoleState => {
  const consoleManagerClients = useContext(ConsoleManagerContext);

  return useMemo(() => {
    if (!key || !consoleManagerClients) {
      return [undefined, undefined];
    }

    return [
      // getState()
      () => {
        return consoleManagerClients.internal.getManagedConsoleState(key);
      },

      // storeState()
      (state: ConsoleDataState) => {
        if (consoleManagerClients.internal.getManagedConsole(key)) {
          consoleManagerClients.internal.storeManagedConsoleState(key, state);
        }
      },
    ];
  }, [consoleManagerClients, key]);
};
