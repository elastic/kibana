/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse, stringify } from 'query-string';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  FC,
} from 'react';
import { isEqual } from 'lodash';
import { decode, encode } from 'rison-node';
import { useHistory, useLocation } from 'react-router-dom';

import { Dictionary } from '../../../common/types/common';

import { getNestedProperty } from './object_utils';

type Accessor = '_a' | '_g';
export type SetUrlState = (
  accessor: Accessor,
  attribute: string | Dictionary<any>,
  value?: any
) => void;
export interface UrlState {
  urlState: Dictionary<any>;
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
export const urlStateStore = createContext<UrlState>({ urlState: {}, setUrlState: () => {} });
const { Provider } = urlStateStore;
export const UrlStateProvider: FC = ({ children }) => {
  const history = useHistory();
  const { search: locationSearchString } = useLocation();

  // We maintain a local state of useLocation's search.
  // This allows us to use the callback variant of setSearch()
  // later on so we can make sure we always act on the
  // latest url state.
  const [searchString, setSearchString] = useState(locationSearchString);

  // Any change of the original search
  // string we get from React Router
  // we pass on to our own state.
  useEffect(() => {
    setSearchString(locationSearchString);
  }, [locationSearchString]);

  // Any change to the search string we maintain in our own state
  // should trigger a possible URL update.
  useEffect(() => {
    if (locationSearchString !== searchString) {
      history.push({ search: searchString });
    }
    // `locationSearchString` is not part of this comparator since we only want
    // to trigger this when `searchString` updates. Since `locationSearchString` triggers
    // the previous `useEffect` and updates to `searchString` anyway it's not necessary
    // to have it here too.
  }, [searchString]);

  const setUrlState: SetUrlState = useCallback(
    (accessor: Accessor, attribute: string | Dictionary<any>, value?: any) => {
      setSearchString((prevSearchString) => {
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
            return stringify(parsedQueryString, { sort: false });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Could not save url state', error);
        }

        // as a fallback and to satisfy the hooks callback requirements
        // return the previous state if we didn't need or were not able to update.
        return prevSearchString;
      });
    },
    [searchString]
  );

  const urlState = useMemo(() => parseUrlState(searchString), [searchString]);

  return <Provider value={{ urlState, setUrlState }}>{children}</Provider>;
};

export const useUrlState = (accessor: Accessor) => {
  const { urlState, setUrlState } = useContext(urlStateStore);
  return [
    typeof urlState !== 'object' ? undefined : urlState[accessor],
    (attribute: string | Dictionary<any>, value?: any) => setUrlState(accessor, attribute, value),
  ];
};
