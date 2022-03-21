/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'query-string';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  FC,
  useRef,
  useEffect,
} from 'react';
import { isEqual } from 'lodash';
import { decode, encode } from 'rison-node';
import { useHistory, useLocation } from 'react-router-dom';

import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { Dictionary } from '../../../common/types/common';

import { getNestedProperty } from './object_utils';
import { MlPages } from '../../../common/constants/locator';
import { isPopulatedObject } from '../../../common';

type Accessor = '_a' | '_g';
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
function isRisonSerializationRequired(queryParam: string): boolean {
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
export const urlStateStore = createContext<UrlState>({
  searchString: '',
  setUrlState: () => {},
});

const { Provider } = urlStateStore;

export const UrlStateProvider: FC = ({ children }) => {
  const history = useHistory();
  const { search: searchString } = useLocation();

  const setUrlState: SetUrlState = useCallback(
    (
      accessor: Accessor,
      attribute: string | Dictionary<any>,
      value?: any,
      replaceState?: boolean
    ) => {
      const prevSearchString = searchString;
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
    [searchString]
  );

  return <Provider value={{ searchString, setUrlState }}>{children}</Provider>;
};

export const useUrlState = (
  accessor: Accessor
): [
  Record<string, any>,
  (attribute: string | Dictionary<unknown>, value?: unknown, replaceState?: boolean) => void
] => {
  const { searchString, setUrlState: setUrlStateContext } = useContext(urlStateStore);

  const urlState = useMemo(() => {
    const fullUrlState = parseUrlState(searchString);
    if (typeof fullUrlState === 'object') {
      return fullUrlState[accessor];
    }
  }, [searchString]);

  const setUrlState = useCallback(
    (attribute: string | Dictionary<unknown>, value?: unknown, replaceState?: boolean) => {
      setUrlStateContext(accessor, attribute, value, replaceState);
    },
    [accessor, setUrlStateContext]
  );
  return [urlState, setUrlState];
};

type LegacyUrlKeys = 'mlExplorerSwimlane';

export type AppStateKey =
  | 'mlSelectSeverity'
  | 'mlSelectInterval'
  | 'mlAnomaliesTable'
  | MlPages
  | LegacyUrlKeys;

/**
 * Service for managing URL state of particular page.
 */
export class PageUrlStateService<T> {
  private _pageUrlState$ = new BehaviorSubject<T | null>(null);
  private _pageUrlStateCallback: ((update: Partial<T>, replaceState?: boolean) => void) | null =
    null;

  /**
   * Provides updates for the page URL state.
   */
  public getPageUrlState$(): Observable<T> {
    return this._pageUrlState$.pipe(distinctUntilChanged(isEqual));
  }

  public updateUrlState(update: Partial<T>, replaceState?: boolean): void {
    if (!this._pageUrlStateCallback) {
      throw new Error('Callback has not been initialized.');
    }
    this._pageUrlStateCallback(update, replaceState);
  }

  public setCurrentState(currentState: T): void {
    this._pageUrlState$.next(currentState);
  }

  public setUpdateCallback(callback: (update: Partial<T>, replaceState?: boolean) => void): void {
    this._pageUrlStateCallback = callback;
  }
}

/**
 * Hook for managing the URL state of the page.
 */
export const usePageUrlState = <PageUrlState extends object>(
  pageKey: AppStateKey,
  defaultState?: PageUrlState
): [
  PageUrlState,
  (update: Partial<PageUrlState>, replaceState?: boolean) => void,
  PageUrlStateService<PageUrlState>
] => {
  const [appState, setAppState] = useUrlState('_a');
  const pageState = appState?.[pageKey];

  const setCallback = useRef<typeof setAppState>();

  useEffect(() => {
    setCallback.current = setAppState;
  }, [setAppState]);

  const prevPageState = useRef<PageUrlState | undefined>();

  const resultPageState: PageUrlState = useMemo(() => {
    const result = {
      ...(defaultState ?? {}),
      ...(pageState ?? {}),
    };

    if (isEqual(result, prevPageState.current)) {
      return prevPageState.current;
    }

    // Compare prev and current states to only update changed values
    if (isPopulatedObject(prevPageState.current)) {
      for (const key in result) {
        if (isEqual(result[key], prevPageState.current[key])) {
          result[key] = prevPageState.current[key];
        }
      }
    }

    prevPageState.current = result;

    return result;
  }, [pageState]);

  const onStateUpdate = useCallback(
    (update: Partial<PageUrlState>, replaceState?: boolean) => {
      if (!setCallback?.current) {
        throw new Error('Callback for URL state update has not been initialized.');
      }

      setCallback.current(
        pageKey,
        {
          ...resultPageState,
          ...update,
        },
        replaceState
      );
    },
    [pageKey, resultPageState]
  );

  const pageUrlStateService = useMemo(() => new PageUrlStateService<PageUrlState>(), []);

  useEffect(
    function updatePageUrlService() {
      pageUrlStateService.setCurrentState(resultPageState);
      pageUrlStateService.setUpdateCallback(onStateUpdate);
    },
    [pageUrlStateService, onStateUpdate, resultPageState]
  );

  return useMemo(() => {
    return [resultPageState, onStateUpdate, pageUrlStateService];
  }, [resultPageState, onStateUpdate, pageUrlStateService]);
};
