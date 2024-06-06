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

type FieldStatsEmbeddableCustomState = Omit<
  FieldStatsTableState,
  'timeRange' | 'title' | 'description' | 'hidePanelTitles'
>;

export const initializeFieldStatsControls = (rawState: FieldStatsEmbeddableCustomState) => {
  const viewType$ = new BehaviorSubject<'dataView' | 'esql'>(rawState.viewType);
  const dataViewId$ = new BehaviorSubject<string>(rawState.dataViewId);
  const esqlQuery$ = new BehaviorSubject<AggregateQuery>(rawState.esqlQuery);

  const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

  const updateUserInput = (update: FieldStatsEmbeddableCustomState) => {
    viewType$.next(update.viewType);
    dataViewId$.next(update.dataViewId);
    esqlQuery$.next(update.esqlQuery);
  };

  const serializeFieldStatsChartState = (): FieldStatsEmbeddableCustomState => {
    return {
      viewType: viewType$.getValue(),
      dataViewId: dataViewId$.getValue(),
      esqlQuery: esqlQuery$.getValue(),
    };
  };

  const fieldStatsControlsComparators: StateComparators<FieldStatsEmbeddableCustomState> = {
    viewType: [viewType$, (arg) => viewType.next(arg)],
    dataViewId: [dataViewId$, (arg) => dataViewId.next(arg)],
    esqlQuery: [esqlQuery$, (arg) => esqlQuery.next(arg)],
  };

  const onRenderComplete = () => dataLoading$.next(false);
  const onLoading = (v: boolean) => dataLoading$.next(v);
  const onError = (error?: Error) => blockingError$.next(error);

  return {
    fieldStatsControlsApi: {
      viewType$,
      dataViewId$,
      esqlQuery$,
      updateUserInput,
    } as unknown as FieldStatsComponentApi,
    dataLoadingApi: {
      dataLoading$,
      onRenderComplete,
      onLoading,
      onError,
    },
    serializeFieldStatsChartState,
    fieldStatsControlsComparators,
    onFieldStatsTableDestroy: () => {
      viewType$.complete();
      dataViewId$.complete();
      esqlQuery$.complete();
    },
  };
};
