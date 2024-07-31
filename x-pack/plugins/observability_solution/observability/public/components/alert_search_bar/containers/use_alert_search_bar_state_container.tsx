/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';
import * as t from 'io-ts';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { SavedQuery, TimefilterContract } from '@kbn/data-plugin/public';
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

    initializeUrlAndStateContainer(
      timefilterService,
      stateContainer,
      urlStateStorage,
      urlStorageKey
    );

    start();

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

function initializeUrlAndStateContainer(
  timefilterService: TimefilterContract,
  stateContainer: AlertSearchBarStateContainer,
  urlStateStorage: IKbnUrlStateStorage,
  urlStorageKey: string
) {
  const urlState = alertSearchBarState.decode(
    urlStateStorage.get<Partial<AlertSearchBarContainerState>>(urlStorageKey)
  );
  const validUrlState = isRight(urlState) ? pipe(urlState).right : {};
  const timeFilterTime = timefilterService.getTime();
  const timeFilterState = timefilterService.isTimeTouched()
    ? {
        rangeFrom: timeFilterTime.from,
        rangeTo: timeFilterTime.to,
      }
    : {};

  const currentState = {
    ...defaultState,
    ...timeFilterState,
    ...validUrlState,
  };

  stateContainer.set(currentState);
  urlStateStorage.set(urlStorageKey, currentState, {
    replace: true,
  });
  urlStateStorage.kbnUrlControls.flush();
}
