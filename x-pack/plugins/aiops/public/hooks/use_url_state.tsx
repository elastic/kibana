/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { parse, stringify } from 'query-string';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { decode, encode } from 'rison-node';
import { useHistory, useLocation } from 'react-router-dom';
import { isEqual } from 'lodash';

export interface Dictionary<TValue> {
  [id: string]: TValue;
}

// TODO duplicate of ml/object_utils
export const getNestedProperty = (
  obj: Record<string, any>,
  accessor: string,
  defaultValue?: any
) => {
  const value = accessor.split('.').reduce((o, i) => o?.[i], obj);

  if (value === undefined) return defaultValue;

  return value;
};

export type Accessor = '_a' | '_g';
export type SetUrlState = (
  accessor: Accessor,
  attribute: string | Dictionary<any>,
  value?: any,
  replaceState?: boolean
) => void;
export interface UrlState {
  searchString: string;
  setUrlState: SetUrlState;
}

/**
 * Set of URL query parameters that require the rison serialization.
 */
const risonSerializedParams = new Set(['_a', '_g']);

/**
 * Checks if the URL query parameter requires rison serialization.
 * @param queryParam
 */
export function isRisonSerializationRequired(queryParam: string): boolean {
  return risonSerializedParams.has(queryParam);
}

export function parseUrlState(search: string): Dictionary<any> {
  const urlState: Dictionary<any> = {};
  const parsedQueryString = parse(search, { sort: false });

  try {
    Object.keys(parsedQueryString).forEach((a) => {
      if (isRisonSerializationRequired(a)) {
        urlState[a] = decode(parsedQueryString[a] as string);
      } else {
        urlState[a] = parsedQueryString[a];
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Could not read url state', error);
  }

  return urlState;
}

// Compared to the original appState/globalState,
// this no longer makes use of fetch/save methods.
// - Reading from `location.search` is the successor of `fetch`.
// - `history.push()` is the successor of `save`.
// - The exposed state and set call make use of the above and make sure that
//   different urlStates(e.g. `_a` / `_g`) don't overwrite each other.
// This uses a context to be able to maintain only one instance
// of the url state. It gets passed down with `UrlStateProvider`
// and can be used via `useUrlState`.
export const aiopsUrlStateStore = createContext<UrlState>({
  searchString: '',
  setUrlState: () => {},
});

export const { Provider } = aiopsUrlStateStore;

export const UrlStateProvider: FC = ({ children }) => {
  const { Provider: StateProvider } = aiopsUrlStateStore;

  const history = useHistory();
  const { search: urlSearchString } = useLocation();

  const setUrlState: SetUrlState = useCallback(
    (
      accessor: Accessor,
      attribute: string | Dictionary<any>,
      value?: any,
      replaceState?: boolean
    ) => {
      const prevSearchString = urlSearchString;
      const urlState = parseUrlState(prevSearchString);
      const parsedQueryString = parse(prevSearchString, { sort: false });

      if (!Object.prototype.hasOwnProperty.call(urlState, accessor)) {
        urlState[accessor] = {};
      }

      if (typeof attribute === 'string') {
        if (isEqual(getNestedProperty(urlState, `${accessor}.${attribute}`), value)) {
          return prevSearchString;
        }

        urlState[accessor][attribute] = value;
      } else {
        const attributes = attribute;
        Object.keys(attributes).forEach((a) => {
          urlState[accessor][a] = attributes[a];
        });
      }

      try {
        const oldLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        Object.keys(urlState).forEach((a) => {
          if (isRisonSerializationRequired(a)) {
            parsedQueryString[a] = encode(urlState[a]);
          } else {
            parsedQueryString[a] = urlState[a];
          }
        });
        const newLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        if (oldLocationSearchString !== newLocationSearchString) {
          const newSearchString = stringify(parsedQueryString, { sort: false });
          if (replaceState) {
            history.replace({ search: newSearchString });
          } else {
            history.push({ search: newSearchString });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Could not save url state', error);
      }
    },
    [history, urlSearchString]
  );

  return (
    <StateProvider value={{ searchString: urlSearchString, setUrlState }}>{children}</StateProvider>
  );
};

export const useUrlState = (accessor: Accessor) => {
  const { searchString, setUrlState: setUrlStateContext } = useContext(aiopsUrlStateStore);

  const urlState = useMemo(() => {
    const fullUrlState = parseUrlState(searchString);
    if (typeof fullUrlState === 'object') {
      return fullUrlState[accessor];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString]);

  const setUrlState = useCallback(
    (attribute: string | Dictionary<any>, value?: any, replaceState?: boolean) => {
      setUrlStateContext(accessor, attribute, value, replaceState);
    },
    [accessor, setUrlStateContext]
  );
  return [urlState, setUrlState];
};

export const AppStateKey = 'AIOPS_INDEX_VIEWER';

/**
 * Hook for managing the URL state of the page.
 */
export const usePageUrlState = <PageUrlState extends {}>(
  pageKey: typeof AppStateKey,
  defaultState?: PageUrlState
): [PageUrlState, (update: Partial<PageUrlState>, replaceState?: boolean) => void] => {
  const [appState, setAppState] = useUrlState('_a');
  const pageState = appState?.[pageKey];

  const resultPageState: PageUrlState = useMemo(() => {
    return {
      ...(defaultState ?? {}),
      ...(pageState ?? {}),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageState]);

  const onStateUpdate = useCallback(
    (update: Partial<PageUrlState>, replaceState?: boolean) => {
      setAppState(
        pageKey,
        {
          ...resultPageState,
          ...update,
        },
        replaceState
      );
    },
    [pageKey, resultPageState, setAppState]
  );

  return useMemo(() => {
    return [resultPageState, onStateUpdate];
  }, [resultPageState, onStateUpdate]);
};
