/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TitlesApi } from '@kbn/presentation-publishing/interfaces/titles/titles_api';
import { BehaviorSubject } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type { StateComparators } from '@kbn/presentation-publishing';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import { DEFAULT_MAX_SERIES_TO_PLOT } from '../../application/services/anomaly_explorer_charts_service';
import type {
  AnomalyChartsComponentApi,
  AnomalyChartsDataLoadingApi,
  AnomalyChartsEmbeddableRuntimeState,
  AnomalyChartsEmbeddableState,
} from '../types';

export const initializeAnomalyChartsControls = (
  rawState: AnomalyChartsEmbeddableState,
  titlesApi?: TitlesApi,
  parentApi?: unknown
) => {
  const jobIds$ = new BehaviorSubject<JobId[]>(rawState.jobIds);
  const maxSeriesToPlot$ = new BehaviorSubject<number>(
    rawState.maxSeriesToPlot ?? DEFAULT_MAX_SERIES_TO_PLOT
  );
  const severityThreshold$ = new BehaviorSubject<number | undefined>(rawState.severityThreshold);
  const selectedEntities$ = new BehaviorSubject<MlEntityField[] | undefined>(
    rawState.selectedEntities
  );
  const interval$ = new BehaviorSubject<number | undefined>(undefined);
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

  const updateUserInput = (update: AnomalyChartsEmbeddableState) => {
    jobIds$.next(update.jobIds);
    maxSeriesToPlot$.next(update.maxSeriesToPlot);
    if (titlesApi) {
      titlesApi.setPanelTitle(update.title);
    }
  };

  const updateSeverityThreshold = (v: number) => severityThreshold$.next(v);
  const updateSelectedEntities = (v: MlEntityField[]) => selectedEntities$.next(v);
  const setInterval = (v: number) => interval$.next(v);

  const serializeAnomalyChartsState = (): AnomalyChartsEmbeddableState => {
    return {
      jobIds: jobIds$.value,
      maxSeriesToPlot: maxSeriesToPlot$.value,
      severityThreshold: severityThreshold$.value,
      selectedEntities: selectedEntities$.value,
    };
  };

  const anomalyChartsComparators: StateComparators<AnomalyChartsEmbeddableRuntimeState> = {
    jobIds: [jobIds$, (arg: JobId[]) => jobIds$.next(arg), fastIsEqual],
    maxSeriesToPlot: [maxSeriesToPlot$, (arg: number) => maxSeriesToPlot$.next(arg)],
    severityThreshold: [severityThreshold$, (arg?: number) => severityThreshold$.next(arg)],
    selectedEntities: [
      selectedEntities$,
      (arg?: MlEntityField[]) => selectedEntities$.next(arg),
      fastIsEqual,
    ],
  };
  const onRenderComplete = () => dataLoading$.next(false);
  const onLoading = (v: boolean) => dataLoading$.next(v);
  const onError = (error?: Error) => blockingError$.next(error);

  return {
    anomalyChartsControlsApi: {
      jobIds$,
      maxSeriesToPlot$,
      severityThreshold$,
      selectedEntities$,
      updateUserInput,
      updateSeverityThreshold,
      updateSelectedEntities,
    } as AnomalyChartsComponentApi,
    dataLoadingApi: {
      dataLoading: dataLoading$,
      setInterval,
      onRenderComplete,
      onLoading,
      onError,
    } as AnomalyChartsDataLoadingApi,
    serializeAnomalyChartsState,
    anomalyChartsComparators,
    onAnomalyChartsDestroy: () => {
      jobIds$.complete();
      maxSeriesToPlot$.complete();
      severityThreshold$.complete();
      selectedEntities$.complete();
    },
  };
};
