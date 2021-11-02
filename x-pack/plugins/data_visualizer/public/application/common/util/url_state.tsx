/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { decode } from 'rison-node';

export interface Dictionary<TValue> {
  [id: string]: TValue;
}

// duplicate of ml/object_utils
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
export const dataVisualizerUrlStateStore = createContext<UrlState>({
  searchString: '',
  setUrlState: () => {},
});

export const { Provider } = dataVisualizerUrlStateStore;

export const useUrlState = (accessor: Accessor) => {
  const { searchString, setUrlState: setUrlStateContext } = useContext(dataVisualizerUrlStateStore);

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

export type AppStateKey = 'DATA_VISUALIZER_INDEX_VIEWER';

/**
 * Hook for managing the URL state of the page.
 */
export const usePageUrlState = <PageUrlState extends {}>(
  pageKey: AppStateKey,
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
