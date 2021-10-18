/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { GlobalState } from '../../url_state';
import { MonitoringStartPluginDependencies } from '../../types';
import { TimeRange, RefreshInterval } from '../../../../../../src/plugins/data/public';
import { Legacy } from '../../legacy_shims';

interface GlobalStateProviderProps {
  query: MonitoringStartPluginDependencies['data']['query'];
  toasts: MonitoringStartPluginDependencies['core']['notifications']['toasts'];
}

export interface State {
  [key: string]: unknown;
  cluster_uuid?: string;
  ccs?: any;
  inSetupMode?: boolean;
  save?: () => void;
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}

export const GlobalStateContext = createContext({} as State);

export const GlobalStateProvider: React.FC<GlobalStateProviderProps> = ({
  query,
  toasts,
  children,
}) => {
  const localState: State = {};
  const state = new GlobalState(query, toasts, localState as { [key: string]: unknown });

  const initialState: any = state.getState();
  for (const key in initialState) {
    if (!initialState.hasOwnProperty(key)) {
      continue;
    }
    localState[key] = initialState[key];
  }

  localState.refreshInterval = { value: 10000, pause: false };

  localState.save = () => {
    const newState = { ...localState };
    delete newState.save;
    state.setState(newState);
  };

  const { value, pause } = Legacy.shims.timefilter.getRefreshInterval();
  if (!value && pause) {
    Legacy.shims.timefilter.setRefreshInterval(localState.refreshInterval);
    localState.save?.();
  }

  return <GlobalStateContext.Provider value={localState}>{children}</GlobalStateContext.Provider>;
};
