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
import { globalUrlStateActions, globalUrlStateSelectors } from '../../store/global_url_state';
import { selectIsRegister } from '../../store/global_url_state/selectors';
interface RegisterQueryParams<State> {
  urlStateKey: string;
  decodeUrlState?: (value: string | undefined) => State | null;
}

/**
 * Add urlStateKey and the initial value to redux store.
 */
export const registerUrlParam = <State>({
  urlStateKey,
}: RegisterQueryParams<State>): State | null => {
  const initialValue = getParamFromQueryString(
    getQueryStringFromLocation(window.location.search),
    urlStateKey
  );

  const store = getStore();
  store?.dispatch(
    globalUrlStateActions.registerUrlParam({ key: urlStateKey, initialValue: initialValue ?? null })
  );

  return decodeRisonUrlState<State>(initialValue ?? undefined);
};

interface UpdateQueryParams<State> {
  urlStateKey: string;
  value: State | null;
  history: H.History;
}

/**
 * Update query param in the url.
 * Make sure to call `registerQueryParam` before calling this function.
 */
export const updateUrlParam = <State>({
  urlStateKey,
  value,
  history,
}: UpdateQueryParams<State>) => {
  const store = getStore();
  if (!store) return;

  const encodedValue = value !== null ? encodeRisonUrlState(value) : null;
  const isRegister = selectIsRegister(store.getState(), urlStateKey);

  // Only update the URL after the query param is register
  if (isRegister) {
    replaceQueryStringParams([{ key: urlStateKey, value: encodedValue }], history);
    store?.dispatch(
      globalUrlStateActions.updateUrlParam({ key: urlStateKey, value: encodedValue })
    );
  }
};

/**
 * It generates the global query string for security solutions links.
 */
export const useGlobalQueryString = () => {
  const globalUrlState = useShallowEqualSelector(globalUrlStateSelectors.selectGlobalUrlState);

  const globalQueryString = useMemo(
    () =>
      stringify(url.encodeQuery(pickBy((value) => !isEmpty(value), globalUrlState)), {
        sort: false,
        encode: false,
      }),
    [globalUrlState]
  );

  return globalQueryString;
};

/**
 * It displays or hide the global query string from the URL.
 * It should be called on every page change.
 */
export const updateQueryStringDisplay = (show: boolean, history: H.History) => {
  // TODO: Do we need this? Because all links already contain the query string.
  const state = getStore()?.getState();
  const globalUrlState = state ? globalUrlStateSelectors.selectGlobalUrlState(state) : {};

  const params = Object.entries(globalUrlState).map(([key, value]) => ({
    key,
    value: show ? value : null,
  }));

  replaceQueryStringParams(params, history);
};

const replaceQueryStringParams = (
  params: Array<{ key: string; value: string | null }>,
  history: H.History
) => {
  const queryValues = parse(window.location.search, { sort: false });

  params.forEach(({ key, value }) => {
    if (value == null || value === '') {
      delete queryValues[key];
    } else {
      queryValues[key] = value;
    }
  });

  const search = stringify(url.encodeQuery(queryValues), { sort: false, encode: false });

  history.replace({ search });
};
