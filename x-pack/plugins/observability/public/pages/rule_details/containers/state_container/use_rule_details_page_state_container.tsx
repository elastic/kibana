/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

import { TimefilterContract } from '@kbn/data-plugin/public';
import {
  createKbnUrlStateStorage,
  syncState,
  IKbnUrlStateStorage,
  useContainerSelector,
} from '@kbn/kibana-utils-plugin/public';
import { useTimefilterService } from '../../../../hooks/use_timefilter_service';

import {
  useContainer,
  defaultState,
  RuleDetailsPageStateContainer,
  RuleDetailsState,
} from './state_container';

const STATE_STORAGE_KEY = '_a';

export function useRuleDetailsPageStateContainer(urlStateStorage?: IKbnUrlStateStorage) {
  const stateContainer = useContainer();

  useUrlStateSyncEffect(stateContainer, urlStateStorage);

  const { setTab } = stateContainer.transitions;
  const { tabId } = useContainerSelector(stateContainer, (state) => state);

  return {
    tabId,
    setTab,
  };
}

function useUrlStateSyncEffect(
  stateContainer: RuleDetailsPageStateContainer,
  kbnUrlStateStorage?: IKbnUrlStateStorage
) {
  const history = useHistory();
  const timefilterService = useTimefilterService();

  useEffect(() => {
    const urlStateStorage = kbnUrlStateStorage
      ? kbnUrlStateStorage
      : createKbnUrlStateStorage({
          history,
          useHash: false,
          useHashQuery: false,
        });
    const { start, stop } = setupUrlStateSync(stateContainer, urlStateStorage);

    start();

    syncUrlStateWithInitialContainerState(timefilterService, stateContainer, urlStateStorage);

    return stop;
  }, [stateContainer, history, timefilterService, kbnUrlStateStorage]);
}

function setupUrlStateSync(
  stateContainer: RuleDetailsPageStateContainer,
  stateStorage: IKbnUrlStateStorage
) {
  // This handles filling the state when an incomplete URL set is provided
  const setWithDefaults = (changedState: Partial<RuleDetailsState> | null) => {
    stateContainer.set({ ...defaultState, ...changedState });
  };

  return syncState({
    storageKey: STATE_STORAGE_KEY,
    stateContainer: {
      ...stateContainer,
      set: setWithDefaults,
    },
    stateStorage,
  });
}

function syncUrlStateWithInitialContainerState(
  timefilterService: TimefilterContract,
  stateContainer: RuleDetailsPageStateContainer,
  urlStateStorage: IKbnUrlStateStorage
) {
  const urlState = urlStateStorage.get<Partial<RuleDetailsState>>('_a');

  if (urlState) {
    const newState = {
      ...defaultState,
      ...urlState,
    };

    stateContainer.set(newState);
  } else if (timefilterService.isTimeTouched()) {
    const { from, to } = timefilterService.getTime();
    const newState = {
      ...defaultState,
      rangeFrom: from,
      rangeTo: to,
    };

    stateContainer.set(newState);
  } else {
    // Reset the state container when no URL state or timefilter range is set to avoid accidentally
    // re-using state set on a previous visit to the page in the same session
    stateContainer.set(defaultState);
  }

  urlStateStorage.set(STATE_STORAGE_KEY, stateContainer.get());
}
