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
import { LocalUIFilterName } from '../../../common/ui_filter';
import { pickKeys } from '../../../common/utils/pick_keys';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { localUIFilterNames } from '../../../server/lib/rum_client/ui_filters/local_ui_filters/config';
import { UIFilters } from '../../../typings/ui_filters';
import { useDeepObjectIdentity } from '../../hooks/useDeepObjectIdentity';
import { getDateRange } from './helpers';
import { resolveUrlParams } from './resolve_url_params';
import { IUrlParams } from './types';

export interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

function useUiFilters(params: IUrlParams): UIFilters {
  const { kuery, environment, ...urlParams } = params;
  const localUiFilters = mapValues(
    pickKeys(urlParams, ...localUIFilterNames),
    (val) => (val ? val.split(',') : [])
  ) as Partial<Record<LocalUIFilterName, string[]>>;

  return useDeepObjectIdentity({
    kuery,
    ...localUiFilters,
  });
}

const defaultRefresh = (_time: TimeRange) => {};

const UrlParamsContext = createContext({
  rangeId: 0,
  refreshTimeRange: defaultRefresh,
  uiFilters: {} as UIFilters,
  urlParams: {} as IUrlParams,
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

    const uiFilters = useUiFilters(urlParams);

    const contextValue = useMemo(() => {
      return {
        rangeId,
        refreshTimeRange,
        urlParams,
        uiFilters,
      };
    }, [rangeId, refreshTimeRange, uiFilters, urlParams]);

    return (
      <UrlParamsContext.Provider children={children} value={contextValue} />
    );
  }
);

export { UrlParamsContext, UrlParamsProvider, useUiFilters };
