/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as H from 'history';
import type { ParsedQuery } from 'query-string';
import { parse, stringify } from 'query-string';
import { useCallback, useEffect, useMemo } from 'react';

import { url } from '@kbn/kibana-utils-plugin/public';
import { isEmpty, pickBy } from 'lodash/fp';
import { useHistory, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  decodeRisonUrlState,
  encodeRisonUrlState,
  getParamFromQueryString,
  getQueryStringFromLocation,
} from '../../components/url_state/helpers';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { globalUrlParamActions, globalUrlParamSelectors } from '../../store/global_url_param';
import { useRouteSpy } from '../route/use_route_spy';
import { getLinkInfo } from '../../links';

/**
 * Adds urlParamKey and the initial value to redux store.
 *
 * Please call this hook at the highest possible level of the rendering tree.
 * So it is only called when the application starts instead of on every page.
 *
 * @param urlParamKey Must not change.
 * @param onInitialize Called once when initializing.
 */
export const useInitializeUrlParam = <State>(
  urlParamKey: string,
  /**
   * @param state Decoded URL param value.
   */
  onInitialize: (state: State | null) => void
) => {
  const dispatch = useDispatch();
  const { search } = useLocation();

  useEffect(() => {
    const initialValue = getParamFromQueryString(getQueryStringFromLocation(search), urlParamKey);

    dispatch(
      globalUrlParamActions.registerUrlParam({
        key: urlParamKey,
        initialValue: initialValue ?? null,
      })
    );

    // execute consumer initialization
    onInitialize(decodeRisonUrlState<State>(initialValue ?? undefined));

    return () => {
      dispatch(globalUrlParamActions.deregisterUrlParam({ key: urlParamKey }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- It must run only once when the application is initializing.
  }, []);
};

/**
 * Updates URL parameters in the url.
 *
 * Make sure to call `useInitializeUrlParam` before calling this function.
 */
export const useUpdateUrlParam = <State>(urlParamKey: string) => {
  const dispatch = useDispatch();

  const updateUrlParam = useCallback(
    (value: State | null) => {
      const encodedValue = value !== null ? encodeRisonUrlState(value) : null;
      dispatch(globalUrlParamActions.updateUrlParam({ key: urlParamKey, value: encodedValue }));
    },
    [dispatch, urlParamKey]
  );

  return updateUrlParam;
};

export const useGlobalQueryString = (): string => {
  const globalUrlParam = useShallowEqualSelector(globalUrlParamSelectors.selectGlobalUrlParam);

  const globalQueryString = useMemo(
    () => encodeQueryString(pickBy((value) => !isEmpty(value), globalUrlParam)),
    [globalUrlParam]
  );

  return globalQueryString;
};

/**
 * - It hides / shows the global query depending on the page.
 * - It updates the URL when globalUrlParam store updates.
 */
export const useSyncGlobalQueryString = () => {
  const history = useHistory();
  const [{ pageName }] = useRouteSpy();
  const globalUrlParam = useShallowEqualSelector(globalUrlParamSelectors.selectGlobalUrlParam);

  useEffect(() => {
    const linkInfo = getLinkInfo(pageName) ?? { skipUrlState: true };
    const params = Object.entries(globalUrlParam).map(([key, value]) => ({
      key,
      value: linkInfo.skipUrlState ? null : value,
    }));

    if (params.length > 0) {
      // window.location.search provides the most updated representation of the url search.
      // It prevents unnecessary re-renders which useLocation would create because 'replaceUrlParams' does update the location.
      // window.location.search also guarantees that we don't overwrite URL param managed outside react-router.
      replaceUrlParams(params, history, window.location.search);
    }
  }, [globalUrlParam, pageName, history]);
};

const encodeQueryString = (urlParams: ParsedQuery<string>): string =>
  stringify(url.encodeQuery(urlParams), { sort: false, encode: false });

const replaceUrlParams = (
  params: Array<{ key: string; value: string | null }>,
  history: H.History,
  search: string
) => {
  const urlParams = parse(search, { sort: false });

  params.forEach(({ key, value }) => {
    if (value == null || value === '') {
      delete urlParams[key];
    } else {
      urlParams[key] = value;
    }
  });

  const newSearch = encodeQueryString(urlParams);

  if (getQueryStringFromLocation(search) !== newSearch) {
    history.replace({ search: newSearch });
  }
};
