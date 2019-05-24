/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useReducer, useEffect, useMemo } from 'react';
import { Location } from 'history';
import { useLocation } from '../../hooks/useLocation';
import { IUrlParams } from './types';
import { LOCATION_UPDATE, TIME_RANGE_REFRESH } from './constants';
import { getParsedDate } from './helpers';
import { resolveUrlParams } from './resolveUrlParams';
import { UIFilters } from '../../../typings/ui-filters';

interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

interface LocationAction {
  type: typeof LOCATION_UPDATE;
  location: Location;
}

interface TimeRangeRefreshAction {
  type: typeof TIME_RANGE_REFRESH;
  time: TimeRange;
}

function useUiFilters(urlParams: IUrlParams): UIFilters {
  return useMemo(
    () => ({
      kuery: urlParams.kuery,
      environment: urlParams.environment
    }),
    [urlParams]
  );
}

const defaultRefresh = (time: TimeRange) => {};

export function urlParamsReducer(
  state: IUrlParams = {},
  action: LocationAction | TimeRangeRefreshAction
): IUrlParams {
  switch (action.type) {
    case LOCATION_UPDATE: {
      return resolveUrlParams(action.location, state);
    }

    case TIME_RANGE_REFRESH:
      return {
        ...state,
        start: getParsedDate(action.time.rangeFrom),
        end: getParsedDate(action.time.rangeTo)
      };

    default:
      return state;
  }
}

const UrlParamsContext = createContext({
  urlParams: {} as IUrlParams,
  refreshTimeRange: defaultRefresh,
  uiFilters: {} as UIFilters
});

const UrlParamsProvider: React.FC<{}> = ({ children }) => {
  const location = useLocation();
  const [urlParams, dispatch] = useReducer(
    urlParamsReducer,
    resolveUrlParams(location, {})
  );
  const uiFilters = useUiFilters(urlParams);

  function refreshTimeRange(time: TimeRange) {
    dispatch({ type: TIME_RANGE_REFRESH, time });
  }

  useEffect(
    () => {
      dispatch({ type: LOCATION_UPDATE, location });
    },
    [location]
  );

  return (
    <UrlParamsContext.Provider
      children={children}
      value={{ urlParams, refreshTimeRange, uiFilters }}
    />
  );
};

export { UrlParamsContext, UrlParamsProvider, useUiFilters };
