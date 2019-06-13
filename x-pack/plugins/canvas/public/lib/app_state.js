/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import querystring from 'querystring';
import rison from 'rison-node';
import { get } from 'lodash';
import { getInitialState } from '../state/initial_state';
import { getWindow } from './get_window';
import { historyProvider } from './history_provider';

function getDefaultState() {
  const transientState = getInitialState('transient');
  return {
    fullscreen: transientState.fullscreen,
    autorefresh: transientState.refresh,
    autoplay: transientState.autoplay,
  };
}

export function getCurrentAppState() {
  const history = historyProvider(getWindow());
  const { search } = history.getLocation();
  const qs = !!search ? querystring.parse(search.replace(/^\?/, '')) : {};
  const appState = !!qs.appState ? rison.decode(qs.appState) : {};
  return appState;
}

export function getAppState(key) {
  const appState = { ...getDefaultState(), ...getCurrentAppState() };
  return key != null ? get(appState, key) : appState;
}

export function setAppState(type, payload) {
  const appState = getCurrentAppState();

  // TODO: validate payloads
  switch (type) {
    case 'fullscreen':
      appState.fullscreen = payload;
      break;

    case 'autoplay':
      appState.autoplay = payload;
      break;

    case 'autorefresh':
      appState.autorefresh = payload;
      break;

    default:
      throw new Error(`Invalid appState type: ${type}`);
  }

  // TODO: push new route, with appState search params, into the route
  console.log('new appState', appState);
}
