/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { parse } from 'query-string';
import { dateRangeSelector } from '../state/selectors';
import { setDateRange } from '../state/actions';
import { getSupportedUrlParams } from '../lib/helper';
import { useUrlParams } from './use_url_params';

/**
 * TODO: it is probably best to move this hook to the router component,
 * and not export it from the module, because we probably only ever want it to be
 * called in one place.
 */
export const useSynchronizedState = () => {
  const [get, set] = useUrlParams();
  const params = get();
  // console.log('params', params);
  const history = useHistory();
  const dateRange = useSelector(dateRangeSelector);
  const dispatch = useDispatch();
  useEffect(() => {
    if (params.dateRangeStart !== dateRange.from || params.dateRangeEnd !== dateRange.to) {
      dispatch(setDateRange({ from: params.dateRangeStart, to: params.dateRangeEnd }));
    }
    /*
     * We only want this effect to fire on initial render, so we can
     * override default store values with initial URL params. Subsequent
     * updates are performed in the history listener below.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () =>
      history.listen((newHistory) => {
        console.log('listener prop', newHistory);
        const supportedParams = getSupportedUrlParams(parse(newHistory.search));
        console.log('supported url params', supportedParams);
        if (
          dateRange.from !== supportedParams.dateRangeStart ||
          dateRange.to !== supportedParams.dateRangeEnd
        ) {
          dispatch(
            setDateRange({ from: supportedParams.dateRangeStart, to: supportedParams.dateRangeEnd })
          );
        }
      }),
    [dispatch, dateRange, history]
  );

  useEffect(() => {
    if (params.dateRangeStart !== dateRange.from || params.dateRangeEnd !== dateRange.to) {
      set({
        dateRangeStart: dateRange.from,
        dateRangeEnd: dateRange.to,
      });
    }
  }, [dateRange, params, set]);

  console.log('the date range from the store', dateRange);
};
