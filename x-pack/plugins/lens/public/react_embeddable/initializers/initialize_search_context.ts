/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, Query, AggregateQuery } from '@kbn/es-query';
import {
  PublishesUnifiedSearch,
  StateComparators,
  initializeTimeRange,
} from '@kbn/presentation-publishing';
import { noop } from 'lodash';
import {
  PublishesSearchSession,
  apiPublishesSearchSession,
} from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { buildObservableVariable } from '../helper';
import { LensRuntimeState, LensUnifiedSearchContext } from '../types';

export function initializeSearchContext(
  initialState: LensRuntimeState,
  parentApi: unknown
): {
  api: PublishesUnifiedSearch & PublishesSearchSession;
  comparators: StateComparators<LensUnifiedSearchContext>;
  serialize: () => LensUnifiedSearchContext;
  cleanup: () => void;
} {
  const [searchSessionId$, searchSessionComparator] = buildObservableVariable<string | undefined>(
    apiPublishesSearchSession(parentApi) ? parentApi.searchSessionId$ : undefined
  );

  const [lastReloadRequestTime, lastReloadRequestTimeComparator] = buildObservableVariable<
    number | undefined
  >(undefined);

  const [filters$, filtersComparator] = buildObservableVariable<Filter[] | undefined>(
    initialState.attributes.state.filters
  );

  const [query$, queryComparator] = buildObservableVariable<Query | AggregateQuery | undefined>(
    initialState.attributes.state.query
  );

  const [timeslice$, timesliceComparator] = buildObservableVariable<[number, number] | undefined>(
    undefined
  );

  const timeRange = initializeTimeRange(initialState);
  return {
    api: {
      searchSessionId$,
      filters$,
      query$,
      timeslice$,
      isCompatibleWithUnifiedSearch: () => true,
      ...timeRange.api,
    },
    comparators: {
      query: queryComparator,
      filters: filtersComparator,
      timeslice: timesliceComparator,
      ...timeRange.comparators,
      searchSessionId: searchSessionComparator,
      lastReloadRequestTime: lastReloadRequestTimeComparator,
    },
    cleanup: noop,
    serialize: () => ({
      searchSessionId: searchSessionId$.getValue(),
      filters: filters$.getValue(),
      query: query$.getValue(),
      timeslice: timeslice$.getValue(),
      lastReloadRequestTime: lastReloadRequestTime.getValue(),
      ...timeRange.serialize(),
    }),
  };
}
