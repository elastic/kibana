/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

import { TimefilterContract } from '../../../../../../../src/plugins/data/public';
import {
  createKbnUrlStateStorage,
  syncState,
  IKbnUrlStateStorage,
  useContainerSelector,
} from '../../../../../../../src/plugins/kibana_utils/public';
import { useTimefilterService } from '../../../hooks/use_timefilter_service';

import {
  useContainer,
  defaultState,
  AlertsPageStateContainer,
  AlertsPageContainerState,
} from './state_container';

export function useAlertsPageStateContainer() {
  const stateContainer = useContainer();

  useUrlStateSync(stateContainer);

  const { setRangeFrom, setRangeTo, setKuery, setWorkflowStatus } = stateContainer.transitions;
  const { rangeFrom, rangeTo, kuery, workflowStatus } = useContainerSelector(
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
    workflowStatus,
    setWorkflowStatus,
  };
}

function useUrlStateSync(stateContainer: AlertsPageStateContainer) {
  const history = useHistory();
  const timefilterService = useTimefilterService();

  useEffect(() => {
    const urlStateStorage = createKbnUrlStateStorage({ history, useHash: false });
    const { start, stop } = setupUrlStateSync(stateContainer, urlStateStorage);

    start();

    syncUrlStateWithInitialContainerState(timefilterService, stateContainer, urlStateStorage);

    return stop;
  }, [stateContainer, history, timefilterService]);
}

function setupUrlStateSync(
  stateContainer: AlertsPageStateContainer,
  stateStorage: IKbnUrlStateStorage
) {
  const setWithDefaults = (changedState: Partial<AlertsPageContainerState> | null) => {
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
  timefilterService: TimefilterContract,
  stateContainer: AlertsPageStateContainer,
  urlStateStorage: IKbnUrlStateStorage
) {
  const urlState = urlStateStorage.get<Partial<AlertsPageContainerState>>('_a');

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
    stateContainer.set(defaultState);
  }

  urlStateStorage.set('_a', stateContainer.get());
}
