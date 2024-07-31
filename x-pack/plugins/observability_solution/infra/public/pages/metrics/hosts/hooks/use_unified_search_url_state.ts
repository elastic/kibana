/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';
import deepEqual from 'fast-deep-equal';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { enumeration } from '@kbn/securitysolution-io-ts-types';
import { FilterStateStore } from '@kbn/es-query';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useUrlState } from '../../../../hooks/use_url_state';
import {
  useKibanaTimefilterTime,
  useSyncKibanaTimeFilterTime,
} from '../../../../hooks/use_kibana_timefilter_time';
import { DEFAULT_HOST_LIMIT, LOCAL_STORAGE_HOST_LIMIT_KEY } from '../constants';

const DEFAULT_QUERY = {
  language: 'kuery',
  query: '',
};

const DEFAULT_FROM_MINUTES_VALUE = 15;
const INITIAL_DATE_RANGE = { from: `now-${DEFAULT_FROM_MINUTES_VALUE}m`, to: 'now' };

const INITIAL_HOSTS_STATE: HostsState = {
  query: DEFAULT_QUERY,
  filters: [],
  panelFilters: [],
  dateRange: INITIAL_DATE_RANGE,
  limit: DEFAULT_HOST_LIMIT,
};

const reducer = (prevState: HostsState, params: HostsSearchPayload) => {
  const payload = Object.fromEntries(Object.entries(params).filter(([_, v]) => !!v));

  return {
    ...prevState,
    ...payload,
  };
};

export const useHostsUrlState = (): [HostsState, HostsStateUpdater] => {
  const [getTime] = useKibanaTimefilterTime(INITIAL_DATE_RANGE);
  const [localStorageHostLimit, setLocalStorageHostLimit] = useLocalStorage<number>(
    LOCAL_STORAGE_HOST_LIMIT_KEY,
    INITIAL_HOSTS_STATE.limit
  );

  const [urlState, setUrlState] = useUrlState<HostsState>({
    defaultState: {
      ...INITIAL_HOSTS_STATE,
      dateRange: getTime(),
      limit: localStorageHostLimit ?? INITIAL_HOSTS_STATE.limit,
    },
    decodeUrlState,
    encodeUrlState,
    urlStateKey: '_a',
    writeDefaultState: true,
  });

  const [search, setSearch] = useReducer(reducer, urlState);
  if (!deepEqual(search, urlState)) {
    setUrlState(search);
    if (localStorageHostLimit !== search.limit) {
      setLocalStorageHostLimit(search.limit);
    }
  }

  useSyncKibanaTimeFilterTime(INITIAL_DATE_RANGE, urlState.dateRange, (dateRange) =>
    setSearch({ dateRange })
  );

  return [search, setSearch];
};

const HostsFilterRT = rt.intersection([
  rt.type({
    meta: rt.partial({
      alias: rt.union([rt.null, rt.string]),
      disabled: rt.boolean,
      negate: rt.boolean,
      controlledBy: rt.string,
      group: rt.string,
      index: rt.string,
      isMultiIndex: rt.boolean,
      type: rt.string,
      key: rt.string,
      params: rt.any,
      value: rt.any,
    }),
  }),
  rt.partial({
    query: rt.record(rt.string, rt.any),
    $state: rt.type({
      store: enumeration('FilterStateStore', FilterStateStore),
    }),
  }),
]);

const HostsFiltersRT = rt.array(HostsFilterRT);

const HostsQueryStateRT = rt.type({
  language: rt.string,
  query: rt.union([rt.string, rt.record(rt.string, rt.any)]),
});

const StringDateRangeRT = rt.intersection([
  rt.type({
    from: rt.string,
    to: rt.string,
  }),
  rt.partial({ mode: rt.union([rt.literal('absolute'), rt.literal('relative')]) }),
]);

const HostsStateRT = rt.type({
  filters: HostsFiltersRT,
  panelFilters: HostsFiltersRT,
  query: HostsQueryStateRT,
  dateRange: StringDateRangeRT,
  limit: rt.number,
});

export type HostsState = rt.TypeOf<typeof HostsStateRT>;

export type HostsSearchPayload = Partial<HostsState>;

export type HostsStateUpdater = (params: HostsSearchPayload) => void;

export type StringDateRange = rt.TypeOf<typeof StringDateRangeRT>;
export interface StringDateRangeTimestamp {
  from: number;
  to: number;
}

const encodeUrlState = HostsStateRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(HostsStateRT.decode(value), fold(constant(undefined), identity));
};
