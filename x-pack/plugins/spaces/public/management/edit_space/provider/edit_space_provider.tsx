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
import type { Logger } from '@kbn/logging';
import type {
  PrivilegesAPIClientPublicContract,
  RolesAPIClient,
} from '@kbn/security-plugin-types-public';

import {
  createSpaceRolesReducer,
  type IDispatchAction,
  type IEditSpaceStoreState,
} from './reducers';
import type { SpacesManager } from '../../../spaces_manager';

export interface EditSpaceProviderProps
  extends Pick<CoreStart, 'theme' | 'i18n' | 'overlays' | 'http' | 'notifications'> {
  logger: Logger;
  capabilities: ApplicationStart['capabilities'];
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  serverBasePath: string;
  spacesManager: SpacesManager;
  getRolesAPIClient: () => Promise<RolesAPIClient>;
  getPrivilegesAPIClient: () => Promise<PrivilegesAPIClientPublicContract>;
}

export interface EditSpaceServices extends EditSpaceProviderProps {
  invokeClient<R extends unknown>(arg: (clients: EditSpaceClients) => Promise<R>): Promise<R>;
}

interface EditSpaceClients {
  spacesManager: SpacesManager;
  rolesClient: RolesAPIClient;
  privilegesClient: PrivilegesAPIClientPublicContract;
}

export interface EditSpaceStore {
  state: IEditSpaceStoreState;
  dispatch: Dispatch<IDispatchAction>;
}

const createSpaceRolesContext = once(() => createContext<EditSpaceStore | null>(null));

const createEditSpaceServicesContext = once(() => createContext<EditSpaceServices | null>(null));

export const EditSpaceProvider = ({
  children,
  ...services
}: PropsWithChildren<EditSpaceProviderProps>) => {
  const EditSpaceStoreContext = createSpaceRolesContext();
  const EditSpaceServicesContext = createEditSpaceServicesContext();

  const clients = useRef(
    Promise.all([services.getRolesAPIClient(), services.getPrivilegesAPIClient()])
  );
  const rolesAPIClientRef = useRef<RolesAPIClient>();
  const privilegesClientRef = useRef<PrivilegesAPIClientPublicContract>();

  const initialStoreState = useRef<IEditSpaceStoreState>({
    roles: new Map(),
  });

  const { logger } = services;
  const resolveAPIClients = useCallback(async () => {
    try {
      [rolesAPIClientRef.current, privilegesClientRef.current] = await clients.current;
    } catch (err) {
      logger.error('Could not resolve API Clients!', err);
    }
  }, [logger]);

  useEffect(() => {
    resolveAPIClients();
  }, [resolveAPIClients]);

  const createInitialState = useCallback((state: IEditSpaceStoreState) => {
    return state;
  }, []);

  const [state, dispatch] = useReducer(
    createSpaceRolesReducer,
    initialStoreState.current,
    createInitialState
  );

  const invokeClient: EditSpaceServices['invokeClient'] = useCallback(
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
    <EditSpaceServicesContext.Provider value={{ ...services, invokeClient }}>
      <EditSpaceStoreContext.Provider value={{ state, dispatch }}>
        {children}
      </EditSpaceStoreContext.Provider>
    </EditSpaceServicesContext.Provider>
  );
};

export const useEditSpaceServices = (): EditSpaceServices => {
  const context = useContext(createEditSpaceServicesContext());
  if (!context) {
    throw new Error(
      'EditSpaceService Context is missing. Ensure the component or React root is wrapped with EditSpaceProvider'
    );
  }

  return context;
};

export const useEditSpaceStore = () => {
  const context = useContext(createSpaceRolesContext());
  if (!context) {
    throw new Error(
      'EditSpaceStore Context is missing. Ensure the component or React root is wrapped with EditSpaceProvider'
    );
  }

  return context;
};
