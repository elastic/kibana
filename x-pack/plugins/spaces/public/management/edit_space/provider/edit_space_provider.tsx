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
  useState,
} from 'react';

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { Logger } from '@kbn/logging';
import type {
  PrivilegesAPIClientPublicContract,
  RolesAPIClient,
  SecurityLicense,
} from '@kbn/security-plugin-types-public';

import {
  createSpaceRolesReducer,
  type IDispatchAction,
  type IEditSpaceStoreState,
} from './reducers';
import type { SpacesManager } from '../../../spaces_manager';

export interface EditSpaceProviderRootProps
  extends Pick<CoreStart, 'theme' | 'i18n' | 'overlays' | 'http' | 'notifications'> {
  logger: Logger;
  capabilities: ApplicationStart['capabilities'];
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  serverBasePath: string;
  spacesManager: SpacesManager;
  getIsRoleManagementEnabled: () => Promise<() => boolean | undefined>;
  getRolesAPIClient: () => Promise<RolesAPIClient>;
  getPrivilegesAPIClient: () => Promise<PrivilegesAPIClientPublicContract>;
  getSecurityLicense: () => Promise<SecurityLicense>;
}

interface EditSpaceClients {
  spacesManager: SpacesManager;
  rolesClient: RolesAPIClient;
  privilegesClient: PrivilegesAPIClientPublicContract;
}

export interface EditSpaceServices
  extends Omit<
    EditSpaceProviderRootProps,
    | 'getRolesAPIClient'
    | 'getPrivilegesAPIClient'
    | 'getSecurityLicense'
    | 'getIsRoleManagementEnabled'
  > {
  invokeClient<R extends unknown>(arg: (clients: EditSpaceClients) => Promise<R>): Promise<R>;
  license?: SecurityLicense;
  isRoleManagementEnabled: boolean;
}

export interface EditSpaceStore {
  state: IEditSpaceStoreState;
  dispatch: Dispatch<IDispatchAction>;
}

const createSpaceRolesContext = once(() => createContext<EditSpaceStore | null>(null));

const createEditSpaceServicesContext = once(() => createContext<EditSpaceServices | null>(null));

/**
 *
 * @description EditSpaceProvider is a provider component that wraps the children components with the necessary context providers for the Edit Space feature. It provides the necessary services and state management for the feature,
 * this is provided as an export for use with out of band renders within the spaces app
 */
export const EditSpaceProvider = ({
  children,
  state,
  dispatch,
  ...services
}: PropsWithChildren<EditSpaceServices & EditSpaceStore>) => {
  const EditSpaceStoreContext = createSpaceRolesContext();
  const EditSpaceServicesContext = createEditSpaceServicesContext();

  return (
    <EditSpaceServicesContext.Provider value={services}>
      <EditSpaceStoreContext.Provider value={{ state, dispatch }}>
        {children}
      </EditSpaceStoreContext.Provider>
    </EditSpaceServicesContext.Provider>
  );
};

/**
 * @description EditSpaceProviderRoot is the root provider for the Edit Space feature. It instantiates the necessary services and state management for the feature. It ideally
 * should only be rendered once
 */
export const EditSpaceProviderRoot = ({
  children,
  ...services
}: PropsWithChildren<EditSpaceProviderRootProps>) => {
  const {
    logger,
    getRolesAPIClient,
    getPrivilegesAPIClient,
    getSecurityLicense,
    getIsRoleManagementEnabled,
  } = services;

  const [isRoleManagementEnabled, setIsRoleManagementEnabled] = useState<boolean>(false);
  const clients = useRef(Promise.all([getRolesAPIClient(), getPrivilegesAPIClient()]));
  const license = useRef(getSecurityLicense);

  const licenseRef = useRef<SecurityLicense>();
  const rolesAPIClientRef = useRef<RolesAPIClient>();
  const privilegesClientRef = useRef<PrivilegesAPIClientPublicContract>();

  const initialStoreState = useRef<IEditSpaceStoreState>({
    roles: new Map(),
    fetchRolesError: false,
  });

  const resolveSecurityLicense = useCallback(async () => {
    try {
      licenseRef.current = await license.current();
    } catch (err) {
      logger.error('Could not resolve Security License!', err);
    }
  }, [logger]);

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

  useEffect(() => {
    resolveSecurityLicense();
  }, [resolveSecurityLicense]);

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

  getIsRoleManagementEnabled().then((isEnabledFunction) => {
    const result = isEnabledFunction();
    setIsRoleManagementEnabled(typeof result === 'undefined' || result);
  });

  return (
    <EditSpaceProvider
      {...{
        ...services,
        invokeClient,
        state,
        dispatch,
        license: licenseRef.current,
        isRoleManagementEnabled,
      }}
    >
      {children}
    </EditSpaceProvider>
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
