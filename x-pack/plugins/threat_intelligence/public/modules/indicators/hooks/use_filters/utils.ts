/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, Query, TimeRange } from '@kbn/es-query';
import { parse } from 'query-string';
import { decode, encode } from 'rison-node';

export const FILTERS_QUERYSTRING_NAMESPACE = 'indicators';

export const DEFAULT_TIME_RANGE = { from: 'now/d', to: 'now/d' };

export const DEFAULT_QUERY: Readonly<Query> = { query: '', language: 'kuery' };

const INITIAL_FILTERS_STATE: Readonly<SerializableFilterState> = {
  filters: [],
  timeRange: DEFAULT_TIME_RANGE,
  filterQuery: DEFAULT_QUERY,
};

interface SerializableFilterState {
  timeRange?: TimeRange;
  filterQuery: Query;
  filters: Filter[];
}

/**
 * Converts filter state to query string
 * @param filterState Serializable filter state to convert into query string
 * @returns
 */
export const encodeState = (filterState: SerializableFilterState): string =>
  encode(filterState as any);

/**
 *
 * @param encodedFilterState Serialized filter state to decode
 * @returns
 */
const decodeState = (encodedFilterState: string): SerializableFilterState | null =>
  decode(encodedFilterState) as unknown as SerializableFilterState;

/**
 * Find and convert filter state stored within query string into object literal
 * @param searchString Brower query string containing encoded filter information, within single query field
 * @returns SerializableFilterState with all the relevant fields ready to use
 */
export const stateFromQueryParams = (searchString: string): SerializableFilterState => {
  const { [FILTERS_QUERYSTRING_NAMESPACE]: filtersSerialized } = parse(searchString);

  if (!filtersSerialized) {
    return INITIAL_FILTERS_STATE;
  }

  if (Array.isArray(filtersSerialized)) {
    throw new Error('serialized filters should not be an array');
  }

  const deserializedFilters = decodeState(filtersSerialized);

  if (!deserializedFilters) {
    return INITIAL_FILTERS_STATE;
  }

  return {
    ...INITIAL_FILTERS_STATE,
    ...deserializedFilters,
    timeRange: deserializedFilters.timeRange || DEFAULT_TIME_RANGE,
  };
};
