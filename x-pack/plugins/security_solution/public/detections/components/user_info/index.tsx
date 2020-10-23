/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React, { useEffect, useReducer, Dispatch, createContext, useContext } from 'react';

import { usePrivilegeUser } from '../../containers/detection_engine/alerts/use_privilege_user';
import { useSignalIndex } from '../../containers/detection_engine/alerts/use_signal_index';
import { useKibana } from '../../../common/lib/kibana';

export interface State {
  canUserCRUD: boolean | null;
  hasIndexManage: boolean | null;
  hasIndexWrite: boolean | null;
  isSignalIndexExists: boolean | null;
  isAuthenticated: boolean | null;
  hasEncryptionKey: boolean | null;
  loading: boolean;
  signalIndexName: string | null;
  signalIndexMappingOutdated: boolean | null;
}

export const initialState: State = {
  canUserCRUD: null,
  hasIndexManage: null,
  hasIndexWrite: null,
  isSignalIndexExists: null,
  isAuthenticated: null,
  hasEncryptionKey: null,
  loading: true,
  signalIndexName: null,
  signalIndexMappingOutdated: null,
};

export type Action =
  | { type: 'updateLoading'; loading: boolean }
  | {
      type: 'updateHasIndexManage';
      hasIndexManage: boolean | null;
    }
  | {
      type: 'updateHasIndexWrite';
      hasIndexWrite: boolean | null;
    }
  | {
      type: 'updateIsSignalIndexExists';
      isSignalIndexExists: boolean | null;
    }
  | {
      type: 'updateIsAuthenticated';
      isAuthenticated: boolean | null;
    }
  | {
      type: 'updateHasEncryptionKey';
      hasEncryptionKey: boolean | null;
    }
  | {
      type: 'updateCanUserCRUD';
      canUserCRUD: boolean | null;
    }
  | {
      type: 'updateSignalIndexName';
      signalIndexName: string | null;
    }
  | {
      type: 'updateSignalIndexMappingOutdated';
      signalIndexMappingOutdated: boolean | null;
    };

export const userInfoReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'updateLoading': {
      return {
        ...state,
        loading: action.loading,
      };
    }
    case 'updateHasIndexManage': {
      return {
        ...state,
        hasIndexManage: action.hasIndexManage,
      };
    }
    case 'updateHasIndexWrite': {
      return {
        ...state,
        hasIndexWrite: action.hasIndexWrite,
      };
    }
    case 'updateIsSignalIndexExists': {
      return {
        ...state,
        isSignalIndexExists: action.isSignalIndexExists,
      };
    }
    case 'updateIsAuthenticated': {
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
      };
    }
    case 'updateHasEncryptionKey': {
      return {
        ...state,
        hasEncryptionKey: action.hasEncryptionKey,
      };
    }
    case 'updateCanUserCRUD': {
      return {
        ...state,
        canUserCRUD: action.canUserCRUD,
      };
    }
    case 'updateSignalIndexName': {
      return {
        ...state,
        signalIndexName: action.signalIndexName,
      };
    }
    case 'updateSignalIndexMappingOutdated': {
      return {
        ...state,
        signalIndexMappingOutdated: action.signalIndexMappingOutdated,
      };
    }
    default:
      return state;
  }
};

const StateUserInfoContext = createContext<[State, Dispatch<Action>]>([initialState, () => noop]);

export const useUserData = () => useContext(StateUserInfoContext);

interface ManageUserInfoProps {
  children: React.ReactNode;
}

export const ManageUserInfo = ({ children }: ManageUserInfoProps) => (
  <StateUserInfoContext.Provider value={useReducer(userInfoReducer, initialState)}>
    {children}
  </StateUserInfoContext.Provider>
);

export const useUserInfo = (): State => {
  const [
    {
      canUserCRUD,
      hasIndexManage,
      hasIndexWrite,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      loading,
      signalIndexName,
      signalIndexMappingOutdated,
    },
    dispatch,
  ] = useUserData();
  const {
    loading: privilegeLoading,
    isAuthenticated: isApiAuthenticated,
    hasEncryptionKey: isApiEncryptionKey,
    hasIndexManage: hasApiIndexManage,
    hasIndexWrite: hasApiIndexWrite,
  } = usePrivilegeUser();
  const {
    loading: indexNameLoading,
    signalIndexExists: isApiSignalIndexExists,
    signalIndexName: apiSignalIndexName,
    signalIndexMappingOutdated: apiSignalIndexMappingOutdated,
    createDeSignalIndex: createSignalIndex,
  } = useSignalIndex();

  const uiCapabilities = useKibana().services.application.capabilities;
  const capabilitiesCanUserCRUD: boolean =
    typeof uiCapabilities.siem.crud === 'boolean' ? uiCapabilities.siem.crud : false;

  useEffect(() => {
    if (loading !== (privilegeLoading || indexNameLoading)) {
      dispatch({ type: 'updateLoading', loading: privilegeLoading || indexNameLoading });
    }
  }, [dispatch, loading, privilegeLoading, indexNameLoading]);

  useEffect(() => {
    if (!loading && hasIndexManage !== hasApiIndexManage && hasApiIndexManage != null) {
      dispatch({ type: 'updateHasIndexManage', hasIndexManage: hasApiIndexManage });
    }
  }, [dispatch, loading, hasIndexManage, hasApiIndexManage]);

  useEffect(() => {
    if (!loading && hasIndexWrite !== hasApiIndexWrite && hasApiIndexWrite != null) {
      dispatch({ type: 'updateHasIndexWrite', hasIndexWrite: hasApiIndexWrite });
    }
  }, [dispatch, loading, hasIndexWrite, hasApiIndexWrite]);

  useEffect(() => {
    if (
      !loading &&
      isSignalIndexExists !== isApiSignalIndexExists &&
      isApiSignalIndexExists != null
    ) {
      dispatch({ type: 'updateIsSignalIndexExists', isSignalIndexExists: isApiSignalIndexExists });
    }
  }, [dispatch, loading, isSignalIndexExists, isApiSignalIndexExists]);

  useEffect(() => {
    if (!loading && isAuthenticated !== isApiAuthenticated && isApiAuthenticated != null) {
      dispatch({ type: 'updateIsAuthenticated', isAuthenticated: isApiAuthenticated });
    }
  }, [dispatch, loading, isAuthenticated, isApiAuthenticated]);

  useEffect(() => {
    if (!loading && hasEncryptionKey !== isApiEncryptionKey && isApiEncryptionKey != null) {
      dispatch({ type: 'updateHasEncryptionKey', hasEncryptionKey: isApiEncryptionKey });
    }
  }, [dispatch, loading, hasEncryptionKey, isApiEncryptionKey]);

  useEffect(() => {
    if (!loading && canUserCRUD !== capabilitiesCanUserCRUD && capabilitiesCanUserCRUD != null) {
      dispatch({ type: 'updateCanUserCRUD', canUserCRUD: capabilitiesCanUserCRUD });
    }
  }, [dispatch, loading, canUserCRUD, capabilitiesCanUserCRUD]);

  useEffect(() => {
    if (!loading && signalIndexName !== apiSignalIndexName && apiSignalIndexName != null) {
      dispatch({ type: 'updateSignalIndexName', signalIndexName: apiSignalIndexName });
    }
  }, [dispatch, loading, signalIndexName, apiSignalIndexName]);

  useEffect(() => {
    if (
      !loading &&
      signalIndexMappingOutdated !== apiSignalIndexMappingOutdated &&
      apiSignalIndexMappingOutdated != null
    ) {
      dispatch({
        type: 'updateSignalIndexMappingOutdated',
        signalIndexMappingOutdated: apiSignalIndexMappingOutdated,
      });
    }
  }, [dispatch, loading, signalIndexMappingOutdated, apiSignalIndexMappingOutdated]);

  useEffect(() => {
    if (
      isAuthenticated &&
      hasEncryptionKey &&
      hasIndexManage &&
      ((isSignalIndexExists != null && !isSignalIndexExists) ||
        (signalIndexMappingOutdated != null && signalIndexMappingOutdated)) &&
      createSignalIndex != null
    ) {
      createSignalIndex();
    }
  }, [
    createSignalIndex,
    isAuthenticated,
    hasEncryptionKey,
    isSignalIndexExists,
    hasIndexManage,
    signalIndexMappingOutdated,
  ]);

  return {
    loading,
    isSignalIndexExists,
    isAuthenticated,
    hasEncryptionKey,
    canUserCRUD,
    hasIndexManage,
    hasIndexWrite,
    signalIndexName,
    signalIndexMappingOutdated,
  };
};
