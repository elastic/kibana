/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import { get } from 'lodash';
// @ts-expect-error untyped local
import { getInitialState } from '../state/initial_state';
import { getWindow } from './get_window';
// @ts-expect-error untyped local
import { historyProvider } from './history_provider';
// @ts-expect-error untyped local
import { routerProvider } from './router_provider';
import { createTimeInterval, isValidTimeInterval, getTimeInterval } from './time_interval';
import { AppState, AppStateKeys } from '../../types';

export function getDefaultAppState(): AppState {
  const transientState = getInitialState('transient');
  const state: AppState = {};

  if (transientState.fullscreen) {
    state[AppStateKeys.FULLSCREEN] = true;
  }

  if (transientState.refresh.interval > 0) {
    state[AppStateKeys.REFRESH_INTERVAL] = createTimeInterval(transientState.refresh.interval);
  }

  if (transientState.autoplay.enabled) {
    state[AppStateKeys.AUTOPLAY_INTERVAL] = createTimeInterval(transientState.autoplay.interval);
  }

  return state;
}

export function getCurrentAppState(): AppState {
  const history = historyProvider(getWindow());
  const { search } = history.getLocation();
  const qs = !!search ? parse(search.replace(/^\?/, ''), { sort: false }) : {};
  const appState = assignAppState({}, qs);

  return appState;
}

export function getAppState(key?: string): AppState {
  const appState = { ...getDefaultAppState(), ...getCurrentAppState() };
  return key ? get(appState, key) : appState;
}

export function assignAppState(obj: AppState & { [key: string]: any }, appState: AppState) {
  const fullscreen = appState[AppStateKeys.FULLSCREEN];
  const refreshKey = appState[AppStateKeys.REFRESH_INTERVAL];
  const autoplayKey = appState[AppStateKeys.AUTOPLAY_INTERVAL];

  if (fullscreen) {
    obj[AppStateKeys.FULLSCREEN] = true;
  } else {
    delete obj[AppStateKeys.FULLSCREEN];
  }

  const refresh = Array.isArray(refreshKey) ? refreshKey[0] : refreshKey;

  if (refresh && isValidTimeInterval(refresh)) {
    obj[AppStateKeys.REFRESH_INTERVAL] = refresh;
  } else {
    delete obj[AppStateKeys.REFRESH_INTERVAL];
  }

  const autoplay = Array.isArray(autoplayKey) ? autoplayKey[0] : autoplayKey;

  if (autoplay && isValidTimeInterval(autoplay)) {
    obj[AppStateKeys.AUTOPLAY_INTERVAL] = autoplay;
  } else {
    delete obj[AppStateKeys.AUTOPLAY_INTERVAL];
  }

  return obj;
}

export function setFullscreen(payload: boolean) {
  const appState = getAppState();
  const appValue = appState[AppStateKeys.FULLSCREEN];

  if (payload === false && appValue) {
    delete appState[AppStateKeys.FULLSCREEN];
    routerProvider().updateAppState(appState);
  } else if (payload === true && !appValue) {
    appState[AppStateKeys.FULLSCREEN] = true;
    routerProvider().updateAppState(appState);
  }
}

export function setAutoplayInterval(payload: string | null) {
  const appState = getAppState();
  const appValue = appState[AppStateKeys.AUTOPLAY_INTERVAL];

  if (payload !== appValue) {
    if (!payload && appValue) {
      delete appState[AppStateKeys.AUTOPLAY_INTERVAL];
      routerProvider().updateAppState(appState);
    } else if (payload) {
      appState[AppStateKeys.AUTOPLAY_INTERVAL] = payload;
      routerProvider().updateAppState(appState);
    }
  }
}

export function setRefreshInterval(payload: string) {
  const appState = getAppState();
  const appValue = appState[AppStateKeys.REFRESH_INTERVAL];

  if (payload !== appValue) {
    if (getTimeInterval(payload)) {
      appState[AppStateKeys.REFRESH_INTERVAL] = payload;
      routerProvider().updateAppState(appState);
    } else {
      delete appState[AppStateKeys.REFRESH_INTERVAL];
      routerProvider().updateAppState(appState);
    }
  }
}
