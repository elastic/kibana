/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { GlobalState } from '../../url_state';
import { MonitoringStartPluginDependencies, MonitoringStartServices } from '../../types';
import { TimeRange, RefreshInterval, UI_SETTINGS } from '../../../../../../src/plugins/data/public';
import { Legacy } from '../../legacy_shims';

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

/**
 * Make sure we default to an active refresh interval if it's not conflicting
 * with user-defined values
 */
const shouldOverrideRefreshInterval = (
  uiSettings: MonitoringStartServices['uiSettings'],
  timefilter: MonitoringStartPluginDependencies['data']['query']['timefilter']['timefilter']
): boolean => {
  const isUserDefined =
    timefilter.isRefreshIntervalTouched() ||
    !uiSettings.isDefault(UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS);
  if (isUserDefined) {
    return false;
  }

  const currentInterval = timefilter.getRefreshInterval();
  const isPaused = currentInterval.pause || currentInterval.value === 0;
  return isPaused;
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

  if (shouldOverrideRefreshInterval(uiSettings, Legacy.shims.timefilter)) {
    localState.refreshInterval = REFRESH_INTERVAL_OVERRIDE;
    Legacy.shims.timefilter.setRefreshInterval(localState.refreshInterval);
    localState.save();
  }

  return <GlobalStateContext.Provider value={localState}>{children}</GlobalStateContext.Provider>;
};
