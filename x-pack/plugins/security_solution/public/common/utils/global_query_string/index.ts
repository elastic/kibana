/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { difference, isEmpty, pickBy } from 'lodash/fp';
import { useDispatch } from 'react-redux';
import usePrevious from 'react-use/lib/usePrevious';
import {
  encodeQueryString,
  encodeRisonUrlState,
  useGetInitialUrlParamValue,
  useReplaceUrlParams,
} from './helpers';
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
 * @param onInitialize Called once when initializing. It must not change.
 */
export const useInitializeUrlParam = <State>(
  urlParamKey: string,
  /**
   * @param state Decoded URL param value.
   */
  onInitialize: (state: State | null) => void
) => {
  const dispatch = useDispatch();

  const getInitialUrlParamValue = useGetInitialUrlParamValue<State>(urlParamKey);

  useEffect(() => {
    const { param: initialValue, decodedParam: decodedInitialValue } = getInitialUrlParamValue();

    dispatch(
      globalUrlParamActions.registerUrlParam({
        key: urlParamKey,
        initialValue: initialValue ?? null,
      })
    );

    // execute consumer initialization
    onInitialize(decodedInitialValue);

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
  const [{ pageName }] = useRouteSpy();
  const globalUrlParam = useShallowEqualSelector(globalUrlParamSelectors.selectGlobalUrlParam);
  const previousGlobalUrlParams = usePrevious(globalUrlParam);
  const replaceUrlParams = useReplaceUrlParams();

  // Url params that got deleted from GlobalUrlParams
  const unregisteredKeys = useMemo(
    () => difference(Object.keys(previousGlobalUrlParams ?? {}), Object.keys(globalUrlParam)),
    [previousGlobalUrlParams, globalUrlParam]
  );

  useEffect(() => {
    const linkInfo = getLinkInfo(pageName) ?? { skipUrlState: true };
    const params = Object.entries(globalUrlParam).map(([key, value]) => ({
      key,
      value: linkInfo.skipUrlState ? null : value,
    }));

    // Delete unregistered Url params
    unregisteredKeys.forEach((key) => {
      params.push({
        key,
        value: null,
      });
    });

    if (params.length > 0) {
      replaceUrlParams(params);
    }
  }, [globalUrlParam, pageName, unregisteredKeys, replaceUrlParams]);
};
