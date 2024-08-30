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
import useLocalStorage from 'react-use/lib/useLocalStorage';
import deepEqual from 'fast-deep-equal';
import { useReducer } from 'react';
import { useUrlState } from '../../../../hooks/use_url_state';
import { DEFAULT_PAGE_SIZE, LOCAL_STORAGE_PAGE_SIZE_KEY } from '../constants';

export const GET_DEFAULT_TABLE_PROPERTIES: TableProperties = {
  detailsItemId: null,
  sorting: {
    direction: 'desc',
    field: 'alertsCount',
  },
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  },
};

const HOST_TABLE_PROPERTIES_URL_STATE_KEY = 'tableProperties';

const reducer = (prevState: TableProperties, params: Payload) => {
  const payload = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined));

  return {
    ...prevState,
    ...payload,
  };
};

export const useHostsTableUrlState = (): [TableProperties, TablePropertiesUpdater] => {
  const [localStoragePageSize, setLocalStoragePageSize] = useLocalStorage<number>(
    LOCAL_STORAGE_PAGE_SIZE_KEY,
    DEFAULT_PAGE_SIZE
  );

  const [urlState, setUrlState] = useUrlState<TableProperties>({
    defaultState: {
      ...GET_DEFAULT_TABLE_PROPERTIES,
      pagination: {
        ...GET_DEFAULT_TABLE_PROPERTIES.pagination,
        pageSize: localStoragePageSize,
      },
    },

    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_TABLE_PROPERTIES_URL_STATE_KEY,
  });

  const [properties, setProperties] = useReducer(reducer, urlState);
  if (!deepEqual(properties, urlState)) {
    setUrlState(properties);
    if (localStoragePageSize !== properties.pagination.pageSize) {
      setLocalStoragePageSize(properties.pagination.pageSize);
    }
  }

  return [properties, setProperties];
};

const PaginationRT = rt.partial({ pageIndex: rt.number, pageSize: rt.number });
const SortingRT = rt.intersection([
  rt.type({
    field: rt.string,
  }),
  rt.partial({ direction: rt.union([rt.literal('asc'), rt.literal('desc')]) }),
]);

const TableStateRT = rt.type({
  detailsItemId: rt.union([rt.string, rt.null]),
  pagination: PaginationRT,
  sorting: SortingRT,
});

export type TableState = rt.TypeOf<typeof TableStateRT>;
export type Payload = Partial<TableState>;
export type TablePropertiesUpdater = (params: Payload) => void;

export type Sorting = rt.TypeOf<typeof SortingRT>;
type TableProperties = rt.TypeOf<typeof TableStateRT>;

const encodeUrlState = TableStateRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(TableStateRT.decode(value), fold(constant(undefined), identity));
};
