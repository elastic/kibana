/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { type SavedQuery, TimefilterContract } from '@kbn/data-plugin/public';
import {
  createKbnUrlStateStorage,
  syncState,
  IKbnUrlStateStorage,
  useContainerSelector,
  createStateContainer,
  createStateContainerReactHelpers,
} from '@kbn/kibana-utils-plugin/public';

import * as t from 'io-ts';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { datemathStringRt } from '@kbn/io-ts-utils';
import { Filter } from '@kbn/es-query';
import { useKibana } from '../../../common/lib/kibana';

const ALERT_STATUS_ALL = 'all';

export type AlertStatus =
  | typeof ALERT_STATUS_ACTIVE
  | typeof ALERT_STATUS_RECOVERED
  | typeof ALERT_STATUS_UNTRACKED
  | typeof ALERT_STATUS_ALL;

interface AlertSearchBarContainerState {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  status: AlertStatus;
  filters: Filter[];
  savedQueryId?: string;
}

interface AlertSearchBarStateTransitions {
  setRangeFrom: (
    state: AlertSearchBarContainerState
  ) => (rangeFrom: string) => AlertSearchBarContainerState;
  setRangeTo: (
    state: AlertSearchBarContainerState
  ) => (rangeTo: string) => AlertSearchBarContainerState;
  setKuery: (
    state: AlertSearchBarContainerState
  ) => (kuery: string) => AlertSearchBarContainerState;
  setStatus: (
    state: AlertSearchBarContainerState
  ) => (status: AlertStatus) => AlertSearchBarContainerState;
  setFilters: (
    state: AlertSearchBarContainerState
  ) => (filters: Filter[]) => AlertSearchBarContainerState;
  setSavedQueryId: (
    state: AlertSearchBarContainerState
  ) => (savedQueryId?: string) => AlertSearchBarContainerState;
}

const defaultState: AlertSearchBarContainerState = {
  rangeFrom: 'now-24h',
  rangeTo: 'now',
  kuery: '',
  status: ALERT_STATUS_ALL,
  filters: [],
};

const transitions: AlertSearchBarStateTransitions = {
  setRangeFrom: (state) => (rangeFrom) => ({ ...state, rangeFrom }),
  setRangeTo: (state) => (rangeTo) => ({ ...state, rangeTo }),
  setKuery: (state) => (kuery) => ({ ...state, kuery }),
  setStatus: (state) => (status) => ({ ...state, status }),
  setFilters: (state) => (filters) => ({ ...state, filters }),
  setSavedQueryId: (state) => (savedQueryId) => ({ ...state, savedQueryId }),
};

export const alertSearchBarStateContainer = createStateContainer(defaultState, transitions);

type AlertSearchBarStateContainer = typeof alertSearchBarStateContainer;

export const { Provider, useContainer } =
  createStateContainerReactHelpers<AlertSearchBarStateContainer>();

export function useAlertSearchBarStateContainer(
  urlStorageKey: string,
  { replace }: { replace?: boolean } = {}
) {
  const [savedQuery, setSavedQuery] = useState<SavedQuery>();
  const stateContainer = useContainer();

  useUrlStateSyncEffect(stateContainer, urlStorageKey, replace);

  const { setRangeFrom, setRangeTo, setKuery, setStatus, setFilters, setSavedQueryId } =
    stateContainer.transitions;
  const { rangeFrom, rangeTo, kuery, status, filters, savedQueryId } = useContainerSelector(
    stateContainer,
    (state) => state
  );

  useEffect(() => {
    if (!savedQuery) {
      setSavedQueryId(undefined);
      return;
    }
    if (savedQuery.id !== savedQueryId) {
      setSavedQueryId(savedQuery.id);
      if (typeof savedQuery.attributes.query.query === 'string') {
        setKuery(savedQuery.attributes.query.query);
      }
      if (savedQuery.attributes.filters?.length) {
        setFilters(savedQuery.attributes.filters);
      }
      if (savedQuery.attributes.timefilter?.from) {
        setRangeFrom(savedQuery.attributes.timefilter.from);
      }
      if (savedQuery.attributes.timefilter?.to) {
        setRangeFrom(savedQuery.attributes.timefilter.to);
      }
    }
  }, [
    savedQuery,
    savedQueryId,
    setFilters,
    setKuery,
    setRangeFrom,
    setSavedQueryId,
    stateContainer,
  ]);

  return {
    kuery,
    onKueryChange: setKuery,
    onRangeFromChange: setRangeFrom,
    onRangeToChange: setRangeTo,
    onStatusChange: setStatus,
    onFiltersChange: setFilters,
    filters,
    rangeFrom,
    rangeTo,
    status,
    savedQuery,
    setSavedQuery,
    clearSavedQuery() {
      setSavedQueryId(undefined);
    },
  };
}

function useUrlStateSyncEffect(
  stateContainer: AlertSearchBarStateContainer,
  urlStorageKey: string,
  replace: boolean = true
) {
  const history = useHistory();
  const {
    data: {
      query: {
        timefilter: { timefilter: timeFilterService },
      },
    },
  } = useKibana().services;

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
      timeFilterService,
      stateContainer,
      urlStateStorage,
      urlStorageKey,
      replace
    );

    return stop;
  }, [stateContainer, history, timeFilterService, urlStorageKey, replace]);
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
      set: <T,>(key: string, state: T) => urlStateStorage.set(key, state, { replace }),
    },
  });
}

export const alertSearchBarState = t.partial({
  rangeFrom: datemathStringRt,
  rangeTo: datemathStringRt,
  kuery: t.string,
  status: t.union([
    t.literal(ALERT_STATUS_ACTIVE),
    t.literal(ALERT_STATUS_RECOVERED),
    t.literal(ALERT_STATUS_ALL),
  ]),
});

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
    urlStateStorage.set(urlStorageKey, stateContainer.get(), {
      replace: true,
    });
    return;
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
