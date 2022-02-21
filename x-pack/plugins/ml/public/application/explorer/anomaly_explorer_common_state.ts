/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, skipWhile } from 'rxjs/operators';
import { isEqual } from 'lodash';
import type { ExplorerJob } from './explorer_utils';

export interface AnomalyExplorerState {
  selectedJobs: ExplorerJob[];
}

/**
 * Anomaly Explorer common state.
 * Contains related values from a global state.
 */
export class AnomalyExplorerCommonStateService {
  private _selectedJobs$ = new BehaviorSubject<ExplorerJob[] | undefined>(undefined);

  public setSelectedJobs(explorerJobs: ExplorerJob[] | undefined) {
    this._selectedJobs$.next(explorerJobs);
  }

  public getSelectedJobs$(): Observable<ExplorerJob[] | undefined> {
    return this._selectedJobs$.pipe(
      skipWhile((v) => !v),
      distinctUntilChanged(isEqual)
    );
  }
}
