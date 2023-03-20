/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

import {
  createKbnUrlStateStorage,
  syncState,
  IKbnUrlStateStorage,
  useContainerSelector,
} from '@kbn/kibana-utils-plugin/public';

import {
  useContainer,
  defaultState,
  RulesPageStateContainer,
  RulesPageContainerState,
} from './state_container';

export function useRulesPageStateContainer() {
  const stateContainer = useContainer();

  useUrlStateSyncEffect(stateContainer);

  const { setLastResponse, setStatus } = stateContainer.transitions;
  const { lastResponse, status } = useContainerSelector(stateContainer, (state) => state);

  return {
    lastResponse,
    status,
    setLastResponse,
    setStatus,
  };
}

function useUrlStateSyncEffect(stateContainer: RulesPageStateContainer) {
  const history = useHistory();

  useEffect(() => {
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });
    const { start, stop } = setupUrlStateSync(stateContainer, urlStateStorage);

    start();

    syncUrlStateWithInitialContainerState(stateContainer, urlStateStorage);

    return stop;
  }, [stateContainer, history]);
}

function setupUrlStateSync(
  stateContainer: RulesPageStateContainer,
  stateStorage: IKbnUrlStateStorage
) {
  // This handles filling the state when an incomplete URL set is provided
  const setWithDefaults = (changedState: Partial<RulesPageContainerState> | null) => {
    stateContainer.set({ ...defaultState, ...changedState });
  };
  return syncState({
    storageKey: '_a',
    stateContainer: {
      ...stateContainer,
      set: setWithDefaults,
    },
    stateStorage,
  });
}

function syncUrlStateWithInitialContainerState(
  stateContainer: RulesPageStateContainer,
  urlStateStorage: IKbnUrlStateStorage
) {
  const urlState = urlStateStorage.get<Partial<RulesPageContainerState>>('_a');

  if (urlState) {
    const newState = {
      ...defaultState,
      ...urlState,
    };

    stateContainer.set(newState);
  } else {
    // Reset the state container when no URL state or timefilter range is set to avoid accidentally
    // re-using state set on a previous visit to the page in the same session
    stateContainer.set(defaultState);
  }

  urlStateStorage.set('_a', stateContainer.get());
}
