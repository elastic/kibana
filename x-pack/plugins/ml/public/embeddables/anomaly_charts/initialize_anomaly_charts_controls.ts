/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TitlesApi } from '@kbn/presentation-publishing/interfaces/titles/titles_api';
import { BehaviorSubject, combineLatest } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import type { AnomalyChartsComponentApi, AnomalySwimLaneEmbeddableState } from './types';

export const initializeAnomalyChartsControls = (
  rawState: AnomalySwimLaneEmbeddableState,
  titlesApi: TitlesApi
) => {
  const jobIds$ = new BehaviorSubject<JobId[]>(rawState.jobIds);
  const maxSeriesToPlot$ = new BehaviorSubject<number>(rawState.maxSeriesToPlot);

  const updateUserInput = (update: AnomalySwimLaneEmbeddableState) => {
    jobIds$.next(update.jobIds);
    maxSeriesToPlot$.next(update.maxSeriesToPlot);
  };

  const serializeAnomalyChartsState = (): AnomalySwimLaneEmbeddableState => {
    return {
      jobIds: jobIds$.value,
      maxSeriesToPlot: maxSeriesToPlot$.value,
    };
  };

  const anomalyChartsComparators: StateComparators<AnomalyAnomalyChartsControlsState> = {
    jobIds$: [jobIds$, (arg) => jobIds$.next(arg), fastIsEqual],
    maxSeriesToPlot$: [maxSeriesToPlot$, (arg) => maxSeriesToPlot$.next(arg)],
  };

  return {
    anomalyChartsControlsApi: {
      jobIds$,
      maxSeriesToPlot$,
    } as unknown as AnomalyChartsComponentApi,
    serializeAnomalyChartsState,
    anomalyChartsComparators,
    onAnomalyChartsDestroy: () => {
      jobIds$.complete();
      maxSeriesToPlot.complete();
    },
  };
};
