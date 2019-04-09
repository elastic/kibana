/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer } from 'react';
import { useLocation } from './useLocation';
import {
  urlParamsReducer,
  TimeRange,
  refreshTimeRange,
  resolveUrlParams,
  IUrlParams
} from '../store/urlParams';

type RefreshTimeRangeFunction = (time: TimeRange) => void;

export function useUrlParams(): [IUrlParams, RefreshTimeRangeFunction] {
  const location = useLocation();
  const [params, dispatch] = useReducer(
    urlParamsReducer,
    resolveUrlParams(location)
  );

  function refresh(time: TimeRange) {
    dispatch(refreshTimeRange(time));
  }

  return [params, refresh];
}

interface ProviderProps {
  children: (
    {
      urlParams,
      refreshTimeRange
    }: {
      urlParams: IUrlParams;
      refreshTimeRange: RefreshTimeRangeFunction;
    }
  ) => React.ReactNode;
}

// temporarily needed to provide URL params to class components
export function ProvideUrlParams({ children: render }: ProviderProps) {
  const [urlParams, refresh] = useUrlParams();
  return (
    <React.Fragment>
      {render({ urlParams, refreshTimeRange: refresh })}
    </React.Fragment>
  );
}
