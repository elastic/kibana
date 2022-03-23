/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { skipWhile, switchMap, takeUntil } from 'rxjs/operators';
import { StateService } from '../services/state_service';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
import {
  ExplorerChartsData,
  getDefaultChartsData,
} from './explorer_charts/explorer_charts_container_service';
import { AnomalyExplorerChartsService } from '../services/anomaly_explorer_charts_service';
import { getSelectionInfluencers } from './explorer_utils';
import type { PageUrlStateService } from '../util/url_state';
import type { TableSeverity } from '../components/controls/select_severity/select_severity';

export class AnomalyChartsStateService extends StateService {
  private _isChartsDataLoading$ = new BehaviorSubject<boolean>(false);
  private _chartsData$ = new BehaviorSubject<ExplorerChartsData>(getDefaultChartsData());

  constructor(
    private _anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService,
    private _anomalyTimelineStateServices: AnomalyTimelineStateService,
    private _anomalyExplorerChartsService: AnomalyExplorerChartsService,
    private _tableSeverityState: PageUrlStateService<TableSeverity>
  ) {
    super();
    this._init();
  }

  private _init() {
    combineLatest([
      this._anomalyExplorerCommonStateService.getSelectedJobs$(),
      this._anomalyExplorerCommonStateService.getInfluencerFilterQuery$(),
      this._anomalyTimelineStateServices.getContainerWidth$().pipe(skipWhile((v) => v === 0)),
      this._anomalyTimelineStateServices.getSelectedCells$(),
      this._anomalyTimelineStateServices.getViewBySwimlaneFieldName$(),
      this._tableSeverityState.getPageUrlState$(),
    ])
      .pipe(
        takeUntil(this.unsubscribeAll$),
        switchMap(
          ([
            selectedJobs,
            influencerFilterQuery,
            containerWidth,
            selectedCells,
            viewBySwimlaneFieldName,
            severityState,
          ]) => {
            if (!selectedCells) return of(getDefaultChartsData());
            const jobIds = selectedJobs.map((v) => v.id);
            this._isChartsDataLoading$.next(true);

            const selectionInfluencers = getSelectionInfluencers(
              selectedCells,
              viewBySwimlaneFieldName!
            );

            return this._anomalyExplorerChartsService.getAnomalyData$(
              jobIds,
              containerWidth!,
              selectedCells?.times[0] * 1000,
              selectedCells?.times[1] * 1000,
              influencerFilterQuery,
              selectionInfluencers,
              severityState.val,
              6
            );
          }
        )
      )
      .subscribe((v) => {
        this._chartsData$.next(v);
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
