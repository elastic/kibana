/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as H from 'history';
import { parse, ParsedQuery, stringify } from 'query-string';
import { useEffect, useMemo } from 'react';

import { url } from '@kbn/kibana-utils-plugin/public';
import { isEmpty, pickBy } from 'lodash/fp';
import { useHistory } from 'react-router-dom';
import {
  decodeRisonUrlState,
  encodeRisonUrlState,
  getParamFromQueryString,
  getQueryStringFromLocation,
} from '../../components/url_state/helpers';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { getStore } from '../../store';
import { globalUrlParamActions, globalUrlParamSelectors } from '../../store/global_url_param';
import { useRouteSpy } from '../route/use_route_spy';
import { getLinkInfo } from '../../links';
import { SecurityPageName } from '../../../app/types';

interface RegisterUrlParams<State> {
  urlParamKey: string;
}

/**
 * Adds UrlParamKey and the initial value to redux store.
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
}

/**
 * Updates URL parameters in the url.
 *
 * Make sure to call `registerUrlParam` before calling this function.
 */
export const updateUrlParam = <State>({ urlParamKey, value }: UpdateUrlParams<State>) => {
  const store = getStore();
  const encodedValue = value !== null ? encodeRisonUrlState(value) : null;

  store?.dispatch(globalUrlParamActions.updateUrlParam({ key: urlParamKey, value: encodedValue }));
};

/**
 * Generates the global query string for security solutions links.
 */
export const useGlobalQueryString = (): string => {
  const globalUrlParam = useShallowEqualSelector(globalUrlParamSelectors.selectGlobalUrlParam);

  const globalQueryString = useMemo(
    () => encodeQuerySrting(pickBy((value) => !isEmpty(value), globalUrlParam)),
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
    const linkInfo = getLinkInfo(pageName as SecurityPageName) ?? { skipUrlState: true };
    const params = Object.entries(globalUrlParam).map(([key, value]) => ({
      key,
      value: linkInfo.skipUrlState ? null : value,
    }));

    if (params.length > 0) {
      replaceUrlParams(params, history);
    }
  }, [globalUrlParam, pageName, history]);
};

const encodeQuerySrting = (urlParams: ParsedQuery<string>): string =>
  stringify(url.encodeQuery(urlParams), { sort: false, encode: false });

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

  const search = encodeQuerySrting(urlParams);

  if (getQueryStringFromLocation(window.location.search) !== search) {
    history.replace({ search });
  }
};
