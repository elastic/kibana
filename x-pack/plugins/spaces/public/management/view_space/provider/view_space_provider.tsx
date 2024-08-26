/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import React, {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type {
  PrivilegesAPIClientPublicContract,
  RolesAPIClient,
} from '@kbn/security-plugin-types-public';

import {
  createSpaceRolesReducer,
  type IDispatchAction,
  type IViewSpaceStoreState,
} from './reducers';
import type { SpacesManager } from '../../../spaces_manager';

// FIXME: rename to EditSpaceServices
export interface ViewSpaceProviderProps
  extends Pick<CoreStart, 'theme' | 'i18n' | 'overlays' | 'http' | 'notifications'> {
  capabilities: ApplicationStart['capabilities'];
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  serverBasePath: string;
  spacesManager: SpacesManager;
  getRolesAPIClient: () => Promise<RolesAPIClient>;
  getPrivilegesAPIClient: () => Promise<PrivilegesAPIClientPublicContract>;
}

export interface ViewSpaceServices
  extends Omit<ViewSpaceProviderProps, 'getRolesAPIClient' | 'getPrivilegesAPIClient'> {
  invokeClient<R extends unknown>(arg: (clients: ViewSpaceClients) => Promise<R>): Promise<R>;
}

interface ViewSpaceClients {
  spacesManager: ViewSpaceProviderProps['spacesManager'];
  rolesClient: RolesAPIClient;
  privilegesClient: PrivilegesAPIClientPublicContract;
}

export interface ViewSpaceStore {
  state: IViewSpaceStoreState;
  dispatch: Dispatch<IDispatchAction>;
}

const createSpaceRolesContext = once(() => createContext<ViewSpaceStore | null>(null));

const createViewSpaceServicesContext = once(() => createContext<ViewSpaceServices | null>(null));

// FIXME: rename to EditSpaceProvider
export const ViewSpaceProvider = ({
  children,
  getRolesAPIClient,
  getPrivilegesAPIClient,
  ...services
}: PropsWithChildren<ViewSpaceProviderProps>) => {
  const ViewSpaceStoreContext = createSpaceRolesContext();
  const ViewSpaceServicesContext = createViewSpaceServicesContext();

  const clients = useRef(Promise.all([getRolesAPIClient(), getPrivilegesAPIClient()]));
  const rolesAPIClientRef = useRef<RolesAPIClient>();
  const privilegesClientRef = useRef<PrivilegesAPIClientPublicContract>();

  const initialStoreState = useRef<IViewSpaceStoreState>({
    roles: new Map(),
  });

  const resolveAPIClients = useCallback(async () => {
    try {
      [rolesAPIClientRef.current, privilegesClientRef.current] = await clients.current;
    } catch {
      // handle errors
    }
  }, []);

  useEffect(() => {
    resolveAPIClients();
  }, [resolveAPIClients]);

  const createInitialState = useCallback((state: IViewSpaceStoreState) => {
    return state;
  }, []);

  const [state, dispatch] = useReducer(
    createSpaceRolesReducer,
    initialStoreState.current,
    createInitialState
  );

  const invokeClient: ViewSpaceServices['invokeClient'] = useCallback(
    async (...args) => {
      await resolveAPIClients();

      return args[0]({
        spacesManager: services.spacesManager,
        rolesClient: rolesAPIClientRef.current!,
        privilegesClient: privilegesClientRef.current!,
      });
    },
    [resolveAPIClients, services.spacesManager]
  );

  return (
    <ViewSpaceServicesContext.Provider value={{ ...services, invokeClient }}>
      <ViewSpaceStoreContext.Provider value={{ state, dispatch }}>
        {children}
      </ViewSpaceStoreContext.Provider>
    </ViewSpaceServicesContext.Provider>
  );
};

// FIXME: rename to useEditSpaceServices
export const useViewSpaceServices = (): ViewSpaceServices => {
  const context = useContext(createViewSpaceServicesContext());
  if (!context) {
    throw new Error(
      'ViewSpaceService Context is missing. Ensure the component or React root is wrapped with ViewSpaceProvider'
    );
  }

  return context;
};

export const useViewSpaceStore = () => {
  const context = useContext(createSpaceRolesContext());
  if (!context) {
    throw new Error(
      'ViewSpaceStore Context is missing. Ensure the component or React root is wrapped with ViewSpaceProvider'
    );
  }

  return context;
};

export const useViewSpaceStoreDispatch = () => {
  const { dispatch } = useViewSpaceStore();
  return dispatch;
};
