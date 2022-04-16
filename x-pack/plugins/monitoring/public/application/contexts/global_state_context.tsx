/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { TimeRange, RefreshInterval } from '@kbn/data-plugin/public';
import { GlobalState } from '../../url_state';
import { MonitoringStartPluginDependencies, MonitoringStartServices } from '../../types';
import { Legacy } from '../../legacy_shims';
import { shouldOverrideRefreshInterval } from './should_override_refresh_interval';

interface GlobalStateProviderProps {
  query: MonitoringStartPluginDependencies['data']['query'];
  toasts: MonitoringStartServices['notifications']['toasts'];
  uiSettings: MonitoringStartServices['uiSettings'];
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

const REFRESH_INTERVAL_OVERRIDE = {
  pause: false,
  value: 10000,
};

export const GlobalStateProvider: React.FC<GlobalStateProviderProps> = ({
  uiSettings,
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

  localState.save = () => {
    const newState = { ...localState };
    delete newState.save;
    state.setState(newState);
  };

  // default to an active refresh interval if it's not conflicting with user-defined values
  if (shouldOverrideRefreshInterval(uiSettings, Legacy.shims.timefilter)) {
    localState.refreshInterval = REFRESH_INTERVAL_OVERRIDE;
    Legacy.shims.timefilter.setRefreshInterval(localState.refreshInterval);
    localState.save();
  }

  return <GlobalStateContext.Provider value={localState}>{children}</GlobalStateContext.Provider>;
};
