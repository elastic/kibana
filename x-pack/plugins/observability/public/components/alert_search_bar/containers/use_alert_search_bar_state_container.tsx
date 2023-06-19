/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';
import * as t from 'io-ts';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { TimefilterContract } from '@kbn/data-plugin/public';
import {
  createKbnUrlStateStorage,
  syncState,
  IKbnUrlStateStorage,
  useContainerSelector,
} from '@kbn/kibana-utils-plugin/public';
import { datemathStringRT } from '../../../utils/datemath';
import { ALERT_STATUS_ALL } from '../../../../common/constants';
import { useTimefilterService } from '../../../hooks/use_timefilter_service';

import {
  useContainer,
  defaultState,
  AlertSearchBarStateContainer,
  AlertSearchBarContainerState,
} from './state_container';

export const alertSearchBarState = t.partial({
  rangeFrom: datemathStringRT,
  rangeTo: datemathStringRT,
  kuery: t.string,
  status: t.union([
    t.literal(ALERT_STATUS_ACTIVE),
    t.literal(ALERT_STATUS_RECOVERED),
    t.literal(ALERT_STATUS_ALL),
  ]),
});

export function useAlertSearchBarStateContainer(
  urlStorageKey: string,
  { replace }: { replace?: boolean } = {}
) {
  const stateContainer = useContainer();

  useUrlStateSyncEffect(stateContainer, urlStorageKey, replace);

  const { setRangeFrom, setRangeTo, setKuery, setStatus } = stateContainer.transitions;
  const { rangeFrom, rangeTo, kuery, status } = useContainerSelector(
    stateContainer,
    (state) => state
  );

  return {
    kuery,
    onKueryChange: setKuery,
    onRangeFromChange: setRangeFrom,
    onRangeToChange: setRangeTo,
    onStatusChange: setStatus,
    rangeFrom,
    rangeTo,
    status,
  };
}

function useUrlStateSyncEffect(
  stateContainer: AlertSearchBarStateContainer,
  urlStorageKey: string,
  replace: boolean = true
) {
  const history = useHistory();
  const timefilterService = useTimefilterService();

  useEffect(() => {
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });
    const { start, stop } = setupUrlStateSync(
      stateContainer,
      urlStateStorage,
      urlStorageKey,
      replace
    );

    start();

    syncUrlStateWithInitialContainerState(
      timefilterService,
      stateContainer,
      urlStateStorage,
      urlStorageKey,
      replace
    );

    return stop;
  }, [stateContainer, history, timefilterService, urlStorageKey, replace]);
}

function setupUrlStateSync(
  stateContainer: AlertSearchBarStateContainer,
  urlStateStorage: IKbnUrlStateStorage,
  urlStorageKey: string,
  replace: boolean = true
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
    stateStorage: {
      ...urlStateStorage,
      set: <AlertSearchBarStateContainer,>(key: string, state: AlertSearchBarStateContainer) =>
        urlStateStorage.set(key, state, { replace }),
    },
  });
}

function syncUrlStateWithInitialContainerState(
  timefilterService: TimefilterContract,
  stateContainer: AlertSearchBarStateContainer,
  urlStateStorage: IKbnUrlStateStorage,
  urlStorageKey: string,
  replace: boolean = true
) {
  const urlState = alertSearchBarState.decode(
    urlStateStorage.get<Partial<AlertSearchBarContainerState>>(urlStorageKey)
  );

  if (isRight(urlState)) {
    const newState = {
      ...defaultState,
      ...pipe(urlState).right,
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

  urlStateStorage.set(urlStorageKey, stateContainer.get(), {
    replace,
  });
}
