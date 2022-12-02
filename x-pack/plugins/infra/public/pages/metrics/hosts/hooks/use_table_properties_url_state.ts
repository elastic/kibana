/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import deepEqual from 'fast-deep-equal';
import { useEffect, useReducer } from 'react';
import { useUrlState } from '../../../../utils/use_url_state';

export const GET_DEFAULT_TABLE_PROPERTIES = {
  sorting: true,
  pagination: true,
};
const HOST_TABLE_PROPERTIES_URL_STATE_KEY = 'tableProperties';

type Action =
  | { type: 'setPagination'; payload: rt.TypeOf<typeof SetPaginationRT> }
  | { type: 'setSorting'; payload: rt.TypeOf<typeof SetSortingRT> };

const reducer = (state: TableProperties, action: Action): TableProperties => {
  switch (action.type) {
    case 'setPagination':
      return { ...state, ...action.payload };
    case 'setSorting':
      return { ...state, ...action.payload };
    default:
      throw new Error();
  }
};

export const useTableProperties = () => {
  const [urlState, setUrlState] = useUrlState<TableProperties>({
    defaultState: GET_DEFAULT_TABLE_PROPERTIES,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_TABLE_PROPERTIES_URL_STATE_KEY,
  });

  const [state, dispatch] = useReducer(reducer, urlState);

  useEffect(() => {
    if (!deepEqual(state, urlState)) {
      setUrlState(state);
    }
  }, [setUrlState, state, urlState]);

  return {
    state,
    dispatch,
  };
};

const PaginationRT = rt.union([rt.boolean, rt.type({ pageIndex: rt.number, pageSize: rt.number })]);
const SortingRT = rt.union([
  rt.boolean,
  rt.type({ field: rt.string, direction: rt.literal('asc', 'desc') }),
]);

const TablePropertiesRT = rt.type({
  pagination: PaginationRT,
  sorting: SortingRT,
});

const SetSortingRT = rt.partial({
  sorting: SortingRT,
});
const SetPaginationRT = rt.partial({
  pagination: PaginationRT,
});

type TableProperties = rt.TypeOf<typeof TablePropertiesRT>;

const encodeUrlState = TablePropertiesRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(TablePropertiesRT.decode(value), fold(constant(undefined), identity));
};
