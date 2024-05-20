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

import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { FieldStatsDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { FieldStatsComponentApi, FieldStatsEmbeddableState } from './types';

type FieldStatsEmbeddableCustomState = Omit<
  FieldStatsEmbeddableState,
  'timeRange' | 'title' | 'description' | 'hidePanelTitles'
>;

export const initializeFieldStatsControls = (
  rawState: FieldStatsEmbeddableState,
  titlesApi?: TitlesApi,
  parentApi?: unknown
) => {
  const viewType$ = new BehaviorSubject<FieldStatsDetectionViewType>(rawState.viewType);
  const dataViewId$ = new BehaviorSubject<string>(rawState.dataViewId);

  // @TODO: remove
  console.log(`--@@parentApi?.query$`, rawState);
  const interval$ = new BehaviorSubject<number | undefined>(undefined);
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
  const query$ =
    // @ts-ignore
    (rawState.query ? new BehaviorSubject(rawState.query) : parentApi?.query$) ??
    new BehaviorSubject(undefined);
  const filters$ =
    // @ts-ignore
    (rawState.filters ? new BehaviorSubject(rawState.filters) : parentApi?.filters$) ??
    new BehaviorSubject(undefined);
  const refresh$ = new BehaviorSubject<void>(undefined);

  const updateUserInput = (update: FieldStatsEmbeddableCustomState) => {
    viewType$.next(update.viewType);
    dataViewId$.next(update.dataViewId);
  };

  const serializeFieldStatsChartState = (): FieldStatsEmbeddableCustomState => {
    return {
      viewType: viewType$.getValue(),
      dataViewId: dataViewId$.getValue(),
      filters: filters$.getValue(),
      query: query$.getValue(),
    };
  };

  const fieldStatsControlsComparators: StateComparators<FieldStatsEmbeddableCustomState> = {
    viewType: [viewType$, (arg) => viewType.next(arg)],
    dataViewId: [dataViewId$, (arg) => dataViewId.next(arg)],
    filters: [filters$, (arg?: Filter[]) => filters$.next(arg)],
    query: [query$, (arg?: Query) => query$.next(arg)],
  };

  const onRenderComplete = () => dataLoading$.next(false);
  const onLoading = (v: boolean) => dataLoading$.next(v);
  const onError = (error?: Error) => blockingError$.next(error);

  const resetQuery = () => query$.next(undefined);
  const resetFilters = () => filters$.next(undefined);

  return {
    fieldStatsControlsApi: {
      viewType$,
      dataViewId$,
      updateUserInput,
    } as unknown as FieldStatsComponentApi,
    dataLoadingApi: {
      query$,
      filters$,
      refresh$,
      dataLoading$,
      onRenderComplete,
      onLoading,
      onError,
      resetQuery,
      resetFilters,
    },
    serializeFieldStatsChartState,
    fieldStatsControlsComparators,
    onFieldStatsTableDestroy: () => {
      viewType$.complete();
      dataViewId$.complete();
    },
  };
};
