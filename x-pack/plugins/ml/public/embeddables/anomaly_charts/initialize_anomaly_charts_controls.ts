/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TitlesApi } from '@kbn/presentation-publishing/interfaces/titles/titles_api';
import { BehaviorSubject } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import type { AnomalyChartsComponentApi, AnomalyChartsEmbeddableState } from './types';

export const initializeAnomalyChartsControls = (
  rawState: AnomalyChartsEmbeddableState,
  titlesApi: TitlesApi,
  parentApi // @todo: fix type
) => {
  const jobIds$ = new BehaviorSubject<JobId[]>(rawState.jobIds);
  const maxSeriesToPlot$ = new BehaviorSubject<number>(rawState.maxSeriesToPlot);
  const severityThreshold$ = new BehaviorSubject<number>(rawState.severityThreshold);
  const entityFields$ = new BehaviorSubject<number>(rawState.selectedEntities);
  const interval$ = new BehaviorSubject<number | undefined>(undefined);
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
  const query$ =
    // @ts-ignore
    (rawState.query ? new BehaviorSubject(rawState.query) : parentApi?.query$) ??
    new BehaviorSubject(undefined);
  const filters$ =
    // @ts-ignore
    (rawState.query ? new BehaviorSubject(rawState.filters) : parentApi?.filters$) ??
    new BehaviorSubject(undefined);
  const refresh$ = new BehaviorSubject<void>(undefined);

  const updateUserInput = (update: AnomalyChartsEmbeddableState) => {
    jobIds$.next(update.jobIds);
    maxSeriesToPlot$.next(update.maxSeriesToPlot);
    if (titlesApi) {
      titlesApi.setPanelTitle(update.panelTitle);
    }
  };

  const updateSeverityThreshold = (v) => severityThreshold$.next(v.severityThreshold);
  const updateEntityFields = (v) => entityFields$.next(v);
  const setInterval = (v) => interval$.next(v);

  const serializeAnomalyChartsState = (): AnomalyChartsEmbeddableState => {
    return {
      jobIds: jobIds$.value,
      maxSeriesToPlot: maxSeriesToPlot$.value,
      severityThreshold: severityThreshold$.value,
      entityFields: entityFields$.value,
    };
  };

  const anomalyChartsComparators: StateComparators<AnomalyAnomalyChartsControlsState> = {
    jobIds: [jobIds$, (arg) => jobIds$.next(arg), fastIsEqual],
    maxSeriesToPlot: [maxSeriesToPlot$, (arg) => maxSeriesToPlot$.next(arg)],
    severityThreshold: [severityThreshold$, (arg) => severityThreshold$.next(arg)],
    entityFields: [entityFields$, (arg) => severityThreshold$.next(arg)],
  };
  const onRenderComplete = () => dataLoading$.next(false);
  const onLoading = (v) => dataLoading$.next(v);
  const onError = (error) => blockingError$.next(error);

  return {
    anomalyChartsControlsApi: {
      jobIds$,
      maxSeriesToPlot$,
      severityThreshold$,
      entityFields$,
      updateUserInput,
      updateSeverityThreshold,
      updateEntityFields,
    } as unknown as AnomalyChartsComponentApi,
    dataLoadingApi: {
      query$,
      filters$,
      refresh$,
      dataLoading$,
      setInterval,
      onRenderComplete,
      onLoading,
      onError,
    },
    serializeAnomalyChartsState,
    anomalyChartsComparators,
    onAnomalyChartsDestroy: () => {
      jobIds$.complete();
      maxSeriesToPlot$.complete();
      severityThreshold$.complete();
      entityFields$.complete();
    },
  };
};
