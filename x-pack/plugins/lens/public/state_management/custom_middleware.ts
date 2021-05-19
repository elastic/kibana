/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { delay, finalize, switchMap, tap } from 'rxjs/operators';
import _, { debounce } from 'lodash';
import { Dispatch, PayloadAction } from '@reduxjs/toolkit';
import moment from 'moment';
import { trackUiEvent } from '../lens_ui_telemetry';

import {
  waitUntilNextSessionCompletes$,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import { setState, LensGetState, LensDispatch } from '.';
import { LensAppState } from './types';
import { getResolvedDateRange } from '../lib';

function containsDynamicMath(dateMathString: string) {
  return dateMathString.includes('now');
}
const TIME_LAG_PERCENTAGE_LIMIT = 0.02;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customMiddleware = (data: DataPublicPluginStart) => (store: any) => {
  const unsubscribeFromExternalContext = subscribeToExternalContext(
    data,
    store.getState,
    store.dispatch
  );
  return (next: Dispatch) => (action: PayloadAction<Partial<LensAppState>>) => {
    if (action.type === 'app/navigateAway') {
      unsubscribeFromExternalContext();
    }
    // if document was modified or sessionId check if too much time passed to update searchSessionId
    if (
      action.type === 'app/setState' &&
      action.payload?.lastKnownDoc &&
      !_.isEqual(action.payload?.lastKnownDoc, store.getState().app.lastKnownDoc)
    ) {
      updateTimeRange(data, store.dispatch);
    }
    next(action);
  };
};

function subscribeToExternalContext(
  data: DataPublicPluginStart,
  getState: LensGetState,
  dispatch: LensDispatch
) {
  const { query: queryService, search } = data;
  const { filterManager } = queryService;

  const dispatchFromExternal = (searchSessionId = search.session.start()) => {
    const globalFilters = filterManager.getFilters();
    const filters = _.isEqual(getState().app.filters, globalFilters)
      ? null
      : { filters: globalFilters };
    dispatch(
      setState({
        searchSessionId,
        ...filters,
        resolvedDateRange: getResolvedDateRange(queryService.timefilter.timefilter),
      })
    );
  };

  const debounceDispatchFromExternal = debounce(dispatchFromExternal, 100);

  const sessionSubscription = search.session
    .getSession$()
    // wait for a tick to filter/timerange subscribers the chance to update the session id in the state
    .pipe(delay(0))
    // then update if it didn't get updated yet
    .subscribe((newSessionId?: string) => {
      if (newSessionId && getState().app.searchSessionId !== newSessionId) {
        debounceDispatchFromExternal(newSessionId);
      }
    });

  const filterSubscription = filterManager.getUpdates$().subscribe({
    next: () => {
      debounceDispatchFromExternal();
      trackUiEvent('app_filters_updated');
    },
  });

  const timeSubscription = data.query.timefilter.timefilter.getTimeUpdate$().subscribe({
    next: () => {
      debounceDispatchFromExternal();
    },
  });

  const autoRefreshSubscription = data.query.timefilter.timefilter
    .getAutoRefreshFetch$()
    .pipe(
      tap(() => {
        debounceDispatchFromExternal();
      }),
      switchMap((done) =>
        // best way in lens to estimate that all panels are updated is to rely on search session service state
        waitUntilNextSessionCompletes$(search.session).pipe(finalize(done))
      )
    )
    .subscribe();
  return () => {
    filterSubscription.unsubscribe();
    timeSubscription.unsubscribe();
    autoRefreshSubscription.unsubscribe();
    sessionSubscription.unsubscribe();
  };
}

function updateTimeRange(data: DataPublicPluginStart, dispatch: LensDispatch) {
  const timefilter = data.query.timefilter.timefilter;
  const unresolvedTimeRange = timefilter.getTime();
  if (
    !containsDynamicMath(unresolvedTimeRange.from) &&
    !containsDynamicMath(unresolvedTimeRange.to)
  ) {
    return;
  }

  const { min, max } = timefilter.getBounds();

  if (!min || !max) {
    // bounds not fully specified, bailing out
    return;
  }

  // calculate length of currently configured range in ms
  const timeRangeLength = moment.duration(max.diff(min)).asMilliseconds();

  // calculate lag of managed "now" for date math
  const nowDiff = Date.now() - data.nowProvider.get().valueOf();

  // if the lag is signifcant, start a new session to clear the cache
  if (nowDiff > timeRangeLength * TIME_LAG_PERCENTAGE_LIMIT) {
    dispatch(
      setState({
        searchSessionId: data.search.session.start(),
        resolvedDateRange: getResolvedDateRange(timefilter),
      })
    );
  }
}
