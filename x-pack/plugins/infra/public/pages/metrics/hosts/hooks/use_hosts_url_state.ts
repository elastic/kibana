/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer } from 'react';
import { TimeRange } from '@kbn/es-query';
import DateMath from '@kbn/datemath';
import deepEqual from 'fast-deep-equal';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { enumeration } from '@kbn/securitysolution-io-ts-types';
import { FilterStateStore } from '@kbn/es-query';
import { useUrlState } from '../../../../utils/use_url_state';
import { useKibanaTimefilterTime } from '../../../../hooks/use_kibana_timefilter_time';

const DEFAULT_QUERY = {
  language: 'kuery',
  query: '',
};
const DEFAULT_FROM_MINUTES_VALUE = 15;
const INITIAL_DATE = new Date();
export const INITIAL_DATE_RANGE = { from: `now-${DEFAULT_FROM_MINUTES_VALUE}m`, to: 'now' };
const CALCULATED_DATE_RANGE_FROM = new Date(
  INITIAL_DATE.getMinutes() - DEFAULT_FROM_MINUTES_VALUE
).getTime();
const CALCULATED_DATE_RANGE_TO = INITIAL_DATE.getTime();

const INITIAL_HOSTS_STATE: HostsState = {
  query: DEFAULT_QUERY,
  filters: [],
  // for unified search
  dateRange: { ...INITIAL_DATE_RANGE },
  // for useSnapshot
  dateRangeTimestamp: {
    from: CALCULATED_DATE_RANGE_FROM,
    to: CALCULATED_DATE_RANGE_TO,
  },
};

type Action =
  | {
      type: 'setQuery';
      payload: rt.TypeOf<typeof SetQueryType>;
    }
  | { type: 'setFilter'; payload: rt.TypeOf<typeof HostsFiltersRT> };

const reducer = (state: HostsState, action: Action): HostsState => {
  switch (action.type) {
    case 'setFilter':
      return { ...state, filters: [...action.payload] };
    case 'setQuery':
      const { filters, query, ...payload } = action.payload;
      const newFilters = !filters ? state.filters : filters;
      const newQuery = !query ? state.query : query;
      return {
        ...state,
        ...payload,
        filters: [...newFilters],
        query: { ...newQuery },
      };
    default:
      throw new Error();
  }
};

export const useHostsUrlState = () => {
  const [urlState, setUrlState] = useUrlState<HostsState>({
    defaultState: INITIAL_HOSTS_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: '_a',
  });

  const [state, dispatch] = useReducer(reducer, urlState);

  const [getTime] = useKibanaTimefilterTime(INITIAL_DATE_RANGE);

  const getRangeInTimestamp = useCallback(({ from, to }: TimeRange) => {
    const fromTS = DateMath.parse(from)?.valueOf() ?? CALCULATED_DATE_RANGE_FROM;
    const toTS = DateMath.parse(to)?.valueOf() ?? CALCULATED_DATE_RANGE_TO;

    return {
      from: fromTS,
      to: toTS,
    };
  }, []);

  useEffect(() => {
    if (!deepEqual(state, urlState)) {
      setUrlState(state);
    }
  }, [setUrlState, state, urlState]);

  return {
    state,
    dispatch,
    getRangeInTimestamp,
    getTime,
  };
};

const HostsFilterRT = rt.intersection([
  rt.partial({
    $state: rt.type({
      store: enumeration('FilterStateStore', FilterStateStore),
    }),
  }),
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
  }),
]);

const HostsFiltersRT = rt.array(HostsFilterRT);

export const HostsQueryStateRT = rt.type({
  language: rt.string,
  query: rt.any,
});

export const StringDateRangeRT = rt.type({
  from: rt.string,
  to: rt.string,
});

export const DateRangeRT = rt.type({
  from: rt.number,
  to: rt.number,
});

export const HostsStateRT = rt.type({
  filters: HostsFiltersRT,
  query: HostsQueryStateRT,
  dateRange: StringDateRangeRT,
  dateRangeTimestamp: DateRangeRT,
});

export type HostsState = rt.TypeOf<typeof HostsStateRT>;

const SetQueryType = rt.partial({
  query: HostsQueryStateRT,
  dateRange: StringDateRangeRT,
  filters: HostsFiltersRT,
  dateRangeTimestamp: DateRangeRT,
});

const encodeUrlState = HostsStateRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(HostsStateRT.decode(value), fold(constant(undefined), identity));
};
