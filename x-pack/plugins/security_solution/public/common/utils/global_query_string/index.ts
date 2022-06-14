/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as H from 'history';
import { parse, stringify } from 'query-string';
import { useMemo } from 'react';

import { url } from '@kbn/kibana-utils-plugin/public';
import { isEmpty, pickBy } from 'lodash/fp';
import {
  decodeRisonUrlState,
  encodeRisonUrlState,
  getParamFromQueryString,
  getQueryStringFromLocation,
} from '../../components/url_state/helpers';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { getStore } from '../../store';
import { globalUrlParamActions, globalUrlParamSelectors } from '../../store/global_url_param';
import { selectIsRegister } from '../../store/global_url_param/selectors';

interface RegisterUrlParams<State> {
  urlParamKey: string;
  decodeUrlState?: (value: string | undefined) => State | null;
}

/**
 * Adds urlStateKey and the initial value to redux store.
 */
export const registerUrlParam = <State>({
  urlParamKey,
}: RegisterUrlParams<State>): State | null => {
  const initialValue = getParamFromQueryString(
    getQueryStringFromLocation(window.location.search),
    urlParamKey
  );

  const store = getStore();
  store?.dispatch(
    globalUrlParamActions.registerUrlParam({ key: urlParamKey, initialValue: initialValue ?? null })
  );

  return decodeRisonUrlState<State>(initialValue ?? undefined);
};

interface UpdateUrlParams<State> {
  urlParamKey: string;
  value: State | null;
  history: H.History;
}

/**
 * Updates URL parameters in the url.
 * Make sure to call `registerUrlParam` before calling this function.
 */
export const updateUrlParam = <State>({ urlParamKey, value, history }: UpdateUrlParams<State>) => {
  const store = getStore();
  if (!store) return;

  const encodedValue = value !== null ? encodeRisonUrlState(value) : null;
  const isRegister = selectIsRegister(store.getState(), urlParamKey);

  // Only update the URL after the URL param is register
  if (isRegister) {
    replaceUrlParams([{ key: urlParamKey, value: encodedValue }], history);
    store?.dispatch(
      globalUrlParamActions.updateUrlParam({ key: urlParamKey, value: encodedValue })
    );
  }
};

/**
 * Generates the global query string for security solutions links.
 */
export const useGlobalQueryString = (): string => {
  const globalUrlParam = useShallowEqualSelector(globalUrlParamSelectors.selectGlobalUrlParam);

  const globalQueryString = useMemo(
    () =>
      stringify(url.encodeQuery(pickBy((value) => !isEmpty(value), globalUrlParam)), {
        sort: false,
        encode: false,
      }),
    [globalUrlParam]
  );

  return globalQueryString;
};

const replaceUrlParams = (
  params: Array<{ key: string; value: string | null }>,
  history: H.History
) => {
  const urlParams = parse(window.location.search, { sort: false });

  params.forEach(({ key, value }) => {
    if (value == null || value === '') {
      delete urlParams[key];
    } else {
      urlParams[key] = value;
    }
  });

  const search = stringify(url.encodeQuery(urlParams), { sort: false, encode: false });

  history.replace({ search });
};
