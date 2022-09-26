/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, PayloadAction } from '@reduxjs/toolkit';
import moment from 'moment';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  setState,
  LensDispatch,
  LensStoreDeps,
  navigateAway,
  applyChanges,
  selectAutoApplyEnabled,
} from '..';
import { LensAppState, LensState } from '../types';
import { getResolvedDateRange, containsDynamicMath } from '../../utils';
import { subscribeToExternalContext } from './subscribe_to_external_context';
import { onActiveDataChange } from '../lens_slice';
import { DatasourceMap } from '../../types';

function isTimeBased(state: LensState, datasourceMap: DatasourceMap) {
  const { activeDatasourceId, datasourceStates, dataViews } = state.lens;
  return Boolean(
    activeDatasourceId &&
      datasourceStates[activeDatasourceId] &&
      datasourceMap[activeDatasourceId].isTimeBased?.(
        datasourceStates[activeDatasourceId].state,
        dataViews.indexPatterns
      )
  );
}

export const contextMiddleware = (storeDeps: LensStoreDeps) => (store: MiddlewareAPI) => {
  let unsubscribeFromExternalContext: (() => void) | undefined;
  return (next: Dispatch) => (action: PayloadAction<unknown>) => {
    if (
      !(action.payload as Partial<LensAppState>)?.searchSessionId &&
      !onActiveDataChange.match(action) &&
      (selectAutoApplyEnabled(store.getState()) || applyChanges.match(action)) &&
      isTimeBased(store.getState(), storeDeps.datasourceMap)
    ) {
      updateTimeRange(storeDeps.lensServices.data, store.dispatch);
    }
    if (navigateAway.match(action) && unsubscribeFromExternalContext) {
      return unsubscribeFromExternalContext();
    }
    next(action);
    // store stopped loading and external context is not subscribed to yet - do it now
    if (!store.getState().lens.isLoading && !unsubscribeFromExternalContext) {
      unsubscribeFromExternalContext = subscribeToExternalContext(
        storeDeps.lensServices.data,
        store.getState,
        store.dispatch
      );
    }
  };
};

const TIME_LAG_PERCENTAGE_LIMIT = 0.02;
const TIME_LAG_MIN_LIMIT = 10000; // for a small timerange to avoid infinite data refresh timelag minimum is TIME_LAG_ABSOLUTE ms

/**
 * checks if TIME_LAG_PERCENTAGE_LIMIT passed to renew searchSessionId
 * and request new data.
 */
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

  // if the lag is significant, start a new session to clear the cache
  if (nowDiff > Math.max(timeRangeLength * TIME_LAG_PERCENTAGE_LIMIT, TIME_LAG_MIN_LIMIT)) {
    dispatch(
      setState({
        searchSessionId: data.search.session.start(),
        resolvedDateRange: getResolvedDateRange(timefilter),
      })
    );
  }
}
