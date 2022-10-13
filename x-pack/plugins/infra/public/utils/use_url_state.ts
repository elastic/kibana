/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'query-string';
import { Location } from 'history';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { decode, encode, RisonValue } from 'rison-node';
import { useHistory } from 'react-router-dom';
import { url } from '@kbn/kibana-utils-plugin/public';

export const useUrlState = <State>({
  defaultState,
  decodeUrlState,
  encodeUrlState,
  urlStateKey,
  writeDefaultState = false,
}: {
  defaultState: State;
  decodeUrlState: (value: RisonValue | undefined) => State | undefined;
  encodeUrlState: (value: State) => RisonValue | undefined;
  urlStateKey: string;
  writeDefaultState?: boolean;
}) => {
  const history = useHistory();

  // history.location is mutable so we can't reliably use useMemo
  const queryString = history?.location ? getQueryStringFromLocation(history.location) : '';

  const urlStateString = useMemo(() => {
    if (!queryString) {
      return;
    }

    return getParamFromQueryString(queryString, urlStateKey);
  }, [queryString, urlStateKey]);

  const decodedState = useMemo(() => {
    return decodeUrlState(decodeRisonUrlState(urlStateString));
  }, [decodeUrlState, urlStateString]);

  const state = useMemo(() => {
    return typeof decodedState !== 'undefined' ? decodedState : defaultState;
  }, [defaultState, decodedState]);

  const setState = useCallback(
    (newState: State | undefined) => {
      if (!history || !history.location) {
        return;
      }

      const currentLocation = history.location;

      const newLocation = replaceQueryStringInLocation(
        currentLocation,
        replaceStateKeyInQueryString(
          urlStateKey,
          typeof newState !== 'undefined' ? encodeUrlState(newState) : undefined
        )(getQueryStringFromLocation(currentLocation))
      );

      if (newLocation !== currentLocation) {
        history.replace(newLocation);
      }
    },
    [encodeUrlState, history, urlStateKey]
  );

  const [shouldInitialize, setShouldInitialize] = useState(
    writeDefaultState && typeof decodedState === 'undefined'
  );

  useEffect(() => {
    if (shouldInitialize) {
      setShouldInitialize(false);
      setState(defaultState);
    }
  }, [shouldInitialize, setState, defaultState]);

  return [state, setState] as [typeof state, typeof setState];
};

const decodeRisonUrlState = (value: string | undefined | null): RisonValue | undefined => {
  try {
    return value ? decode(value) : undefined;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return {};
    }
    throw error;
  }
};

const encodeRisonUrlState = (state: any) => encode(state);

const getQueryStringFromLocation = (location: Location) => location.search.substring(1);

const getParamFromQueryString = (queryString: string, key: string) => {
  const parsedQueryString = parse(queryString, { sort: false });
  const queryParam = parsedQueryString[key];

  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

export const replaceStateKeyInQueryString =
  <UrlState extends any>(stateKey: string, urlState: UrlState | undefined) =>
  (queryString: string) => {
    const previousQueryValues = parse(queryString, { sort: false });
    const newValue =
      typeof urlState === 'undefined'
        ? previousQueryValues
        : {
            ...previousQueryValues,
            [stateKey]: encodeRisonUrlState(urlState),
          };

    return stringify(url.encodeQuery(newValue), { sort: false, encode: false });
  };

const replaceQueryStringInLocation = (location: Location, queryString: string): Location => {
  if (queryString === getQueryStringFromLocation(location)) {
    return location;
  } else {
    return {
      ...location,
      search: `?${queryString}`,
    };
  }
};
