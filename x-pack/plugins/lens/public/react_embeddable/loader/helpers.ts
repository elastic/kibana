/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARE_ALL_OPTIONS, onlyDisabledFiltersChanged } from '@kbn/es-query';
import { type BehaviorSubject, startWith, distinctUntilChanged, skip } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import type { FetchType } from './types';

const shouldRefreshFilterCompareOptions = {
  ...COMPARE_ALL_OPTIONS,
  // do not compare $state to avoid refreshing when filter is pinned/unpinned (which does not impact results)
  state: false,
};

// this is borrowed from the previous Embeddable logic
export function shouldFetch$(unifiedSearch$: BehaviorSubject<FetchType>, initialValue: FetchType) {
  return unifiedSearch$.pipe(
    startWith(initialValue),
    distinctUntilChanged((previous: FetchType, current: FetchType) => {
      if (
        !fastIsEqual(
          [previous.query, previous.timeRange, previous.timeslice],
          [current.query, current.timeRange, current.timeslice]
        )
      ) {
        return false;
      }

      return onlyDisabledFiltersChanged(
        previous.filters,
        current.filters,
        shouldRefreshFilterCompareOptions
      );
    }),
    skip(1)
  );
}
