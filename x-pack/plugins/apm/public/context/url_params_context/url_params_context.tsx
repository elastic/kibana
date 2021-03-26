/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, uniqueId } from 'lodash';
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
  const localUiFilters = mapValues(
    pickKeys(params, ...localUIFilterNames),
    (val) => (val ? val.split(',') : [])
  ) as Partial<Record<LocalUIFilterName, string[]>>;

  return useDeepObjectIdentity({
    environment: params.environment,
    ...localUiFilters,
  });
}

const defaultRefresh = (_time: TimeRange) => {};

const UrlParamsContext = createContext({
  refreshTimeRange: defaultRefresh,
  uiFilters: {} as UIFilters,
  urlParams: {} as IUrlParams,
});

const UrlParamsProvider: React.ComponentClass<{}> = withRouter(
  ({ location, children }) => {
    const refUrlParams = useRef(resolveUrlParams(location, {}));
    const [, forceUpdate] = useState('');

    const { start, end, rangeFrom, rangeTo } = refUrlParams.current;

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

    const refreshTimeRange = useCallback(
      (timeRange: TimeRange) => {
        refUrlParams.current = {
          ...refUrlParams.current,
          ...getDateRange({ state: {}, ...timeRange }),
        };
        forceUpdate(uniqueId());
      },
      [forceUpdate]
    );

    const uiFilters = useUiFilters(urlParams);

    const contextValue = useMemo(() => {
      return {
        refreshTimeRange,
        urlParams,
        uiFilters,
      };
    }, [refreshTimeRange, uiFilters, urlParams]);

    return (
      <UrlParamsContext.Provider children={children} value={contextValue} />
    );
  }
);

export { UrlParamsContext, UrlParamsProvider, useUiFilters };
