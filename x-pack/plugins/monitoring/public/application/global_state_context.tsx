/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { GlobalState } from '../url_state';
import { MonitoringStartPluginDependencies } from '../types';

interface GlobalStateProviderProps {
  query: MonitoringStartPluginDependencies['data']['query'];
  toasts: MonitoringStartPluginDependencies['core']['notifications']['toasts'];
}

export interface State {
  cluster_uuid?: string;
  ccs?: any;
  inSetupMode?: boolean;
  save?: () => void;
}

export const GlobalStateContext = createContext({} as State);

export const GlobalStateProvider: React.FC<GlobalStateProviderProps> = ({
  query,
  toasts,
  children,
}) => {
  // TODO: remove fakeAngularRootScope and fakeAngularLocation when angular is removed
  const fakeAngularRootScope: Partial<ng.IRootScopeService> = {
    $on: (
      name: string,
      listener: (event: ng.IAngularEvent, ...args: any[]) => any
    ): (() => void) => () => {},
    $applyAsync: () => {},
  };

  const fakeAngularLocation: Partial<ng.ILocationService> = {
    search: () => {
      return {} as any;
    },
    replace: () => {
      return {} as any;
    },
  };

  const localState: { [key: string]: unknown } = {};
  const state = new GlobalState(
    query,
    toasts,
    fakeAngularRootScope,
    fakeAngularLocation,
    localState
  );

  const initialState: any = state.getState();
  for (const key in initialState) {
    if (!initialState.hasOwnProperty(key)) {
      continue;
    }
    localState[key] = initialState[key];
  }

  localState.save = () => {
    const newState = { ...localState };
    delete newState.save;
    state.setState(newState);
  };

  return <GlobalStateContext.Provider value={localState}>{children}</GlobalStateContext.Provider>;
};
