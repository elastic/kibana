/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { withRouter } from 'react-router-dom';
import { getDateRange } from './helpers';
import { resolveUrlParams } from './resolve_url_params';
import { UrlParams } from './types';

export interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

const defaultRefresh = (_time: TimeRange) => {};

const UrlParamsContext = createContext({
  rangeId: 0,
  refreshTimeRange: defaultRefresh,
  urlParams: {} as UrlParams,
});

const UrlParamsProvider: React.ComponentClass<{}> = withRouter(
  ({ location, children }) => {
    const refUrlParams = useRef(resolveUrlParams(location, {}));

    const { start, end, rangeFrom, rangeTo } = refUrlParams.current;

    // Counter to force an update in useFetcher when the refresh button is clicked.
    const [rangeId, setRangeId] = useState(0);

    const urlParams = useMemo(
      () =>
        resolveUrlParams(location, {
          start,
          end,
          rangeFrom,
          rangeTo,
        }),
      [location, start, end, rangeFrom, rangeTo]
    );

    refUrlParams.current = urlParams;

    const refreshTimeRange = useCallback((timeRange: TimeRange) => {
      refUrlParams.current = {
        ...refUrlParams.current,
        ...getDateRange({ state: {}, ...timeRange }),
      };

      setRangeId((prevRangeId) => prevRangeId + 1);
    }, []);

    const contextValue = useMemo(() => {
      return {
        rangeId,
        refreshTimeRange,
        urlParams,
      };
    }, [rangeId, refreshTimeRange, urlParams]);

    return (
      <UrlParamsContext.Provider children={children} value={contextValue} />
    );
  }
);

export { UrlParamsContext, UrlParamsProvider };
