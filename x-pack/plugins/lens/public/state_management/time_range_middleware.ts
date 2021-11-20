/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, PayloadAction } from '@reduxjs/toolkit';
import moment from 'moment';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { setState, LensDispatch } from '.';
import { LensAppState } from './types';
import { getResolvedDateRange, containsDynamicMath } from '../utils';

const TIME_LAG_PERCENTAGE_LIMIT = 0.02;
const TIME_LAG_MIN_LIMIT = 10000; // for a small timerange to avoid infinite data refresh timelag minimum is TIME_LAG_ABSOLUTE ms

/**
 * checks if TIME_LAG_PERCENTAGE_LIMIT passed to renew searchSessionId
 * and request new data.
 */
export const timeRangeMiddleware = (data: DataPublicPluginStart) => (store: MiddlewareAPI) => {
  return (next: Dispatch) => (action: PayloadAction<Partial<LensAppState>>) => {
    if (!action.payload?.searchSessionId) {
      updateTimeRange(data, store.dispatch);
    }
    next(action);
  };
};

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
