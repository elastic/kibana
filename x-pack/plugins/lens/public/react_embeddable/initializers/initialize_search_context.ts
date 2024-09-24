/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, Query, AggregateQuery } from '@kbn/es-query';
import {
  PublishesUnifiedSearch,
  PublishingSubject,
  StateComparators,
  getUnchangingComparator,
  initializeTimeRange,
} from '@kbn/presentation-publishing';
import { noop } from 'lodash';
import { buildObservableVariable } from '../helper';
import { LensRuntimeState, LensUnifiedSearchContext } from '../types';

export function initializeSearchContext(state: LensRuntimeState): {
  api: PublishesUnifiedSearch & { searchSessionId$: PublishingSubject<string | undefined> };
  comparators: StateComparators<LensUnifiedSearchContext>;
  serialize: () => LensUnifiedSearchContext;
  cleanup: () => void;
} {
  const [searchSessionId$] = buildObservableVariable<string | undefined>('');

  const [filters$, filtersComparator] = buildObservableVariable<Filter[] | undefined>(undefined);
  const [query$, queryComparator] = buildObservableVariable<Query | AggregateQuery | undefined>(
    undefined
  );
  const [timeslice$, timesliceComparator] = buildObservableVariable<[number, number] | undefined>(
    undefined
  );

  const timeRange = initializeTimeRange(state);
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
      searchSessionId: getUnchangingComparator<LensRuntimeState, 'searchSessionId'>(),
    },
    cleanup: noop,
    serialize: () => ({
      searchSessionId: searchSessionId$.getValue(),
      filters: filters$.getValue(),
      query: query$.getValue(),
      timeslice: timeslice$.getValue(),
      ...timeRange.serialize(),
    }),
  };
}
