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
  AlertSearchBarStateContainer,
  AlertSearchBarContainerState,
} from './state_container';

export function useAlertSearchBarStateContainer(urlStorageKey: string) {
  const stateContainer = useContainer();

  useUrlStateSyncEffect(stateContainer, urlStorageKey);

  const { setRangeFrom, setRangeTo, setKuery, setStatus } = stateContainer.transitions;
  const { rangeFrom, rangeTo, kuery, status } = useContainerSelector(
    stateContainer,
    (state) => state
  );

  return {
    rangeFrom,
    setRangeFrom,
    rangeTo,
    setRangeTo,
    kuery,
    setKuery,
    status,
    setStatus,
  };
}

function useUrlStateSyncEffect(
  stateContainer: AlertSearchBarStateContainer,
  urlStorageKey: string
) {
  const history = useHistory();
  const timefilterService = useTimefilterService();

  useEffect(() => {
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });
    const { start, stop } = setupUrlStateSync(stateContainer, urlStateStorage, urlStorageKey);

    start();

    syncUrlStateWithInitialContainerState(
      timefilterService,
      stateContainer,
      urlStateStorage,
      urlStorageKey
    );

    return stop;
  }, [stateContainer, history, timefilterService, urlStorageKey]);
}

function setupUrlStateSync(
  stateContainer: AlertSearchBarStateContainer,
  stateStorage: IKbnUrlStateStorage,
  urlStorageKey: string
) {
  // This handles filling the state when an incomplete URL set is provided
  const setWithDefaults = (changedState: Partial<AlertSearchBarContainerState> | null) => {
    stateContainer.set({ ...defaultState, ...changedState });
  };

  return syncState({
    storageKey: urlStorageKey,
    stateContainer: {
      ...stateContainer,
      set: setWithDefaults,
    },
    stateStorage,
  });
}

function syncUrlStateWithInitialContainerState(
  timefilterService: TimefilterContract,
  stateContainer: AlertSearchBarStateContainer,
  urlStateStorage: IKbnUrlStateStorage,
  urlStorageKey: string
) {
  const urlState = urlStateStorage.get<Partial<AlertSearchBarContainerState>>(urlStorageKey);

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

  urlStateStorage.set(urlStorageKey, stateContainer.get());
}
