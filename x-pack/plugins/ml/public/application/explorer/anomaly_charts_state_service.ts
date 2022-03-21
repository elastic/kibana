/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { skipWhile, switchMap } from 'rxjs/operators';
import { StateService } from '../services/state_service';
import type { ResultsApiService } from '../services/ml_api_service/results';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
import { TimefilterContract } from '../../../../../../src/plugins/data/public';
import {
  ExplorerChartsData,
  getDefaultChartsData,
} from './explorer_charts/explorer_charts_container_service';
import { SeriesConfigWithMetadata } from '../services/anomaly_explorer_charts_service';

const MAX_CHARTS_PER_ROW = 4;

export class AnomalyChartsStateService extends StateService {
  private _isChartsDataLoading$ = new BehaviorSubject<boolean>(false);
  private _chartsData$ = new BehaviorSubject<ExplorerChartsData>(getDefaultChartsData());

  constructor(
    private anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService,
    private anomalyTimelineStateServices: AnomalyTimelineStateService,
    private resultsApiServices: ResultsApiService,
    private timeFilter: TimefilterContract
  ) {
    super();
    this._init();
  }

  private _init() {
    combineLatest([
      this.anomalyExplorerCommonStateService.getSelectedJobs$(),
      this.anomalyExplorerCommonStateService.getInfluencerFilterQuery$(),
      this.anomalyTimelineStateServices.getContainerWidth$().pipe(skipWhile((v) => v === 0)),
      this.anomalyTimelineStateServices.getSelectedCells$(),
    ])
      .pipe(
        switchMap(([selectedJobs, influencerFilterQuery, containerWidth, selectedCells]) => {
          const jobIds = selectedJobs.map((v) => v.id);

          if (!selectedCells) return of([]) as Observable<SeriesConfigWithMetadata[]>;

          this._isChartsDataLoading$.next(true);

          const optimumPointSpacing = 5;
          const optimumNumPoints = Math.ceil(containerWidth! / optimumPointSpacing);

          const bounds = this.timeFilter.getActiveBounds();
          const boundsMin = bounds?.min ? bounds.min.valueOf() : undefined;
          const boundsMax = bounds?.max ? bounds.max.valueOf() : undefined;

          return this.resultsApiServices.getAnomalyCharts$(
            jobIds,
            [],
            0,
            selectedCells?.times[0] * 1000,
            selectedCells?.times[1] * 1000,
            { min: boundsMin, max: boundsMax },
            6,
            optimumNumPoints,
            influencerFilterQuery
          );
        })
      )
      .subscribe((v) => {
        const data = getDefaultChartsData();

        // Calculate the number of charts per row, depending on the width available, to a max of 4.
        const chartsPerRow = Math.min(Math.max(Math.floor(900 / 550), 1), MAX_CHARTS_PER_ROW);

        data.seriesToPlot = v;

        data.chartsPerRow = chartsPerRow;

        this._chartsData$.next(data);
        this._isChartsDataLoading$.next(false);
      });
  }

  public getChartsData$(): Observable<ExplorerChartsData> {
    return this._chartsData$.asObservable();
  }

  public getChartsData(): ExplorerChartsData {
    return this._chartsData$.getValue();
  }
}
