/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetch$ } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { type TimefilterContract } from '@kbn/data-plugin/public';
import { combineLatest, startWith, BehaviorSubject } from 'rxjs';
import type { SingleMetricViewerEmbeddableApi } from '../types';

export const initializeSingleMetricViewerDataFetcher = (
  api: SingleMetricViewerEmbeddableApi,
  dataLoading: BehaviorSubject<boolean | undefined>,
  blockingError: BehaviorSubject<Error | undefined>,
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
    fetch$(api),
    refresh$.pipe(startWith(null)),
  ]).subscribe(([singleMetricViewerData, fetchContext]) => {
    let currentBounds;
    let lastRefresh;
    if (timefilter !== undefined && fetchContext.timeRange !== undefined) {
      currentBounds = timefilter.calculateBounds(fetchContext.timeRange);
      lastRefresh = Date.now();
    }
    singleMetricViewerData$.next([singleMetricViewerData, currentBounds, lastRefresh]);
  });

  return {
    singleMetricViewerData$,
    onDestroy: () => {
      subscription.unsubscribe();
    },
  };
};
