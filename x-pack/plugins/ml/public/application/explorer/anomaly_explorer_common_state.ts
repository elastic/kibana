/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map, skipWhile } from 'rxjs/operators';
import { isEqual } from 'lodash';
import type { ExplorerJob } from './explorer_utils';
import type { InfluencersFilterQuery } from '../../../common/types/es_client';
import type { AnomalyExplorerUrlStateService } from './hooks/use_explorer_url_state';

export interface AnomalyExplorerState {
  selectedJobs: ExplorerJob[];
}

/**
 * Anomaly Explorer common state.
 * Contains related values from a global state after and applies required formatting.
 */
export class AnomalyExplorerCommonStateService {
  private _selectedJobs$ = new BehaviorSubject<ExplorerJob[] | undefined>(undefined);
  private _influencersFilterQuery$ = new BehaviorSubject<InfluencersFilterQuery | undefined>(
    undefined
  );

  constructor(private anomalyExplorerUrlStateService: AnomalyExplorerUrlStateService) {
    this._init();
  }

  private _init() {
    this.anomalyExplorerUrlStateService
      .getPageUrlState$()
      .pipe(
        map((urlState) => urlState?.mlExplorerFilter?.influencersFilterQuery)
        // distinctUntilChanged(isEqual)
      )
      .subscribe(this._influencersFilterQuery$);
  }

  public setSelectedJobs(explorerJobs: ExplorerJob[] | undefined) {
    this._selectedJobs$.next(explorerJobs);
  }

  public getSelectedJobs$(): Observable<ExplorerJob[] | undefined> {
    return this._selectedJobs$.pipe(
      skipWhile((v) => !v),
      distinctUntilChanged(isEqual)
    );
  }

  public getInfluencerFilterQuery$(): Observable<InfluencersFilterQuery | undefined> {
    return this._influencersFilterQuery$.pipe(distinctUntilChanged(isEqual));
  }
}
