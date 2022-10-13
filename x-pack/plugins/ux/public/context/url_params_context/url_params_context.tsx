/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { withRouter } from 'react-router-dom';
import {
  UxLocalUIFilterName,
  uxLocalUIFilterNames,
} from '../../../common/ux_ui_filter';
import { pickKeys } from '../../../common/utils/pick_keys';
import { UxUIFilters } from '../../../typings/ui_filters';
import { getDateRange } from './helpers';
import { resolveUrlParams } from './resolve_url_params';
import { UrlParams } from './types';
import { useDeepObjectIdentity } from '../../hooks/use_deep_object_identity';

export interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

function useUxUiFilters(params: UrlParams): UxUIFilters {
  const localUiFilters = mapValues(
    pickKeys(params, ...uxLocalUIFilterNames),
    (val) => (val ? val.split(',') : [])
  ) as Partial<Record<UxLocalUIFilterName, string[]>>;

  return useDeepObjectIdentity({
    environment: params.environment,
    ...localUiFilters,
  });
}

const defaultRefresh = (_time: TimeRange) => {};

const UrlParamsContext = createContext({
  rangeId: 0,
  refreshTimeRange: defaultRefresh,
  uxUiFilters: {} as UxUIFilters,
  urlParams: {} as UrlParams,
});

const UrlParamsProvider: React.ComponentClass<{}> = withRouter(
  ({ location, children }) => {
    const refUrlParams = useRef(resolveUrlParams(location, {}));

    const { start, end, rangeFrom, rangeTo, exactStart, exactEnd } =
      refUrlParams.current;

    // Counter to force an update in useFetcher when the refresh button is clicked.
    const [rangeId, setRangeId] = useState(0);

    const urlParams = useMemo(
      () =>
        resolveUrlParams(location, {
          start,
          end,
          rangeFrom,
          rangeTo,
          exactStart,
          exactEnd,
        }),
      [location, start, end, rangeFrom, rangeTo, exactStart, exactEnd]
    );

    refUrlParams.current = urlParams;

    const refreshTimeRange = useCallback((timeRange: TimeRange) => {
      refUrlParams.current = {
        ...refUrlParams.current,
        ...getDateRange({ state: {}, ...timeRange }),
      };

      setRangeId((prevRangeId) => prevRangeId + 1);
    }, []);

    const uxUiFilters = useUxUiFilters(urlParams);

    const contextValue = useMemo(() => {
      return {
        rangeId,
        refreshTimeRange,
        urlParams,
        uxUiFilters,
      };
    }, [rangeId, refreshTimeRange, uxUiFilters, urlParams]);

    return (
      <UrlParamsContext.Provider children={children} value={contextValue} />
    );
  }
);

export { UrlParamsContext, UrlParamsProvider, useUxUiFilters };
