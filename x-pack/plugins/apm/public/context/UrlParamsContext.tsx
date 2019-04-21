/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useReducer } from 'react';
import { useLocation } from '../hooks/useLocation';
import {
  urlParamsReducer,
  TimeRange,
  refreshTimeRange,
  resolveUrlParams,
  IUrlParams
} from '../store/urlParams';

type RefreshTimeRangeFunction = (time: TimeRange) => void;

const defaultRefresh = (() => null) as RefreshTimeRangeFunction;

const UrlParamsContext = createContext({
  urlParams: {} as IUrlParams,
  refreshTimeRange: defaultRefresh
});

const UrlParamsProvider: React.FC<{}> = ({ children }) => {
  const location = useLocation();
  const [urlParams, dispatch] = useReducer(
    urlParamsReducer,
    resolveUrlParams(location)
  );

  function dispatchRefreshTimeRange(time: TimeRange) {
    dispatch(refreshTimeRange(time));
  }

  return (
    <UrlParamsContext.Provider
      children={children}
      value={{ urlParams, refreshTimeRange: dispatchRefreshTimeRange }}
    />
  );
};

export { UrlParamsContext, UrlParamsProvider };
