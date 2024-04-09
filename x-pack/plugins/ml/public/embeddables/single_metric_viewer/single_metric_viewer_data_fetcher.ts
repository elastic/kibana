/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import type { PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { combineLatest, startWith, BehaviorSubject } from 'rxjs';
import type { SingleMetricViewerEmbeddableApi } from '../types';

export const initializeSingleMetricViewerDataFetcher = (
  api: SingleMetricViewerEmbeddableApi,
  dataLoading: BehaviorSubject<boolean | undefined>,
  blockingError: BehaviorSubject<Error | undefined>,
  appliedTimeRange$: Observable<TimeRange | undefined>,
  query$: PublishesUnifiedSearch['query$'],
  filters$: PublishesUnifiedSearch['filters$'],
  refresh$: Observable<void>,
  timefilter: TimefilterContract
) => {
  const singleMetricViewerData$ = new BehaviorSubject<any | undefined>(undefined);

  const singleMetricViewerInput$ = combineLatest({
    jobIds: api.jobIds,
    selectedDetectorIndex: api.selectedDetectorIndex,
    selectedEntities: api.selectedEntities,
    functionDescription: api.functionDescription,
  });

  const subscription = combineLatest([
    singleMetricViewerInput$,
    appliedTimeRange$,
    query$,
    filters$,
    refresh$.pipe(startWith(null)),
  ]).subscribe((data) => {
    let currentBounds;
    let lastRefresh;
    if (timefilter !== undefined && data[1]) {
      const timeRange = data[1];
      currentBounds = timefilter.calculateBounds(timeRange);
      lastRefresh = Date.now();
    }
    singleMetricViewerData$.next([...data, currentBounds, lastRefresh]);
  });

  return {
    singleMetricViewerData$,
    onDestroy: () => {
      subscription.unsubscribe();
    },
  };
};
