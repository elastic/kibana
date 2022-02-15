/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { useMemo } from 'react';
import { AnomalyTimelineService } from '../services/anomaly_timeline_service';
import type { OverallSwimlaneData, ViewBySwimLaneData } from './explorer_utils';
import { useMlKibana, useTimefilter } from '../contexts/kibana';
import { mlResultsServiceProvider } from '../services/results_service';

/**
 * Service for managing anomaly timeline state.
 */
export class AnomalyTimelineState {
  private _overallSwimLaneData$ = new BehaviorSubject<OverallSwimlaneData | null>(null);
  private _viewBySwimLaneData$ = new BehaviorSubject<ViewBySwimLaneData | null>(null);

  constructor(anomalyTimelineService: AnomalyTimelineService) {}

  public getOverallSwimLaneData(): Observable<OverallSwimlaneData | null> {
    return this._overallSwimLaneData$.asObservable();
  }

  public getViewBySwimLaneData(): Observable<OverallSwimlaneData | null> {
    return this._viewBySwimLaneData$.asObservable();
  }
}

/**
 * Hook to create {@link AnomalyTimelineState} instance.
 */
export function useAnomalyTimelineState(): AnomalyTimelineState {
  const timefilter = useTimefilter();

  const {
    services: {
      mlServices: { mlApiServices },
      uiSettings,
    },
  } = useMlKibana();

  const mlResultsService = useMemo(() => mlResultsServiceProvider(mlApiServices), []);

  const anomalyTimelineService = useMemo(() => {
    return new AnomalyTimelineService(timefilter, uiSettings, mlResultsService);
  }, []);

  return useMemo(() => {
    return new AnomalyTimelineState(anomalyTimelineService);
  }, []);
}
