/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { FieldStatsInitializerViewType } from '../grid_embeddable/types';
import type { FieldStatsInitialState } from '../grid_embeddable/types';
import type { FieldStatsControlsApi } from './types';

export const initializeFieldStatsControls = (rawState: FieldStatsInitialState) => {
  const viewType$ = new BehaviorSubject<FieldStatsInitializerViewType | undefined>(
    rawState.viewType ?? FieldStatsInitializerViewType.ESQL
  );
  const dataViewId$ = new BehaviorSubject<string | undefined>(rawState.dataViewId);
  const query$ = new BehaviorSubject<AggregateQuery | undefined>(rawState.query);
  const showDistributions$ = new BehaviorSubject<boolean | undefined>(rawState.showDistributions);
  const resetData$ = new BehaviorSubject<number>(Date.now());

  const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
  const blockingError = new BehaviorSubject<Error | undefined>(undefined);

  const updateUserInput = (update: FieldStatsInitialState, shouldResetData = false) => {
    if (shouldResetData) {
      resetData$.next(Date.now());
    }
    viewType$.next(update.viewType);
    dataViewId$.next(update.dataViewId);
    query$.next(update.query);
  };

  const serializeFieldStatsChartState = (): FieldStatsInitialState => {
    return {
      viewType: viewType$.getValue(),
      dataViewId: dataViewId$.getValue(),
      query: query$.getValue(),
      showDistributions: showDistributions$.getValue(),
    };
  };

  const fieldStatsControlsComparators: StateComparators<FieldStatsInitialState> = {
    viewType: [viewType$, (arg) => viewType$.next(arg)],
    dataViewId: [dataViewId$, (arg) => dataViewId$.next(arg)],
    query: [query$, (arg) => query$.next(arg), fastIsEqual],
    showDistributions: [showDistributions$, (arg) => showDistributions$.next(arg)],
  };

  const onRenderComplete = () => dataLoading$.next(false);
  const onLoading = (v: boolean) => dataLoading$.next(v);
  const onError = (error?: Error) => blockingError.next(error);

  return {
    fieldStatsControlsApi: {
      viewType$,
      dataViewId$,
      query$,
      updateUserInput,
      showDistributions$,
    } as unknown as FieldStatsControlsApi,
    dataLoadingApi: {
      dataLoading: dataLoading$,
      onRenderComplete,
      onLoading,
      onError,
      blockingError,
    },
    // Reset data is internal state management, so no need to expose this in api
    resetData$,
    serializeFieldStatsChartState,
    fieldStatsControlsComparators,
    onFieldStatsTableDestroy: () => {
      viewType$.complete();
      dataViewId$.complete();
      query$.complete();
      resetData$.complete();
    },
  };
};
