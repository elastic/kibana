/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Service for firing and registering for events across the different
 * components in the Explorer dashboard.
 */

import { isEqual } from 'lodash';
import type { Observable } from 'rxjs';
import { from, isObservable, Subject } from 'rxjs';
import { distinctUntilChanged, flatMap, scan, shareReplay } from 'rxjs';
import type { DeepPartial } from '../../../common/types/common';
import { jobSelectionActionCreator } from './actions';
import { EXPLORER_ACTION } from './explorer_constants';
import type { ExplorerState } from './reducers';
import { explorerReducer, getExplorerDefaultState } from './reducers';
import type { MlFieldFormatService } from '../services/field_format_service';

type ExplorerAction = Action | Observable<ActionPayload>;
export const explorerAction$ = new Subject<ExplorerAction>();

export type ActionPayload = any;

export interface Action {
  type: string;
  payload?: ActionPayload;
}

const explorerFilteredAction$ = explorerAction$.pipe(
  // consider observables as side-effects
  flatMap((action: ExplorerAction) =>
    isObservable(action) ? action : (from([action]) as Observable<ExplorerAction>)
  ),
  distinctUntilChanged(isEqual)
);

// applies action and returns state
const explorerState$: Observable<ExplorerState> = explorerFilteredAction$.pipe(
  scan(explorerReducer, getExplorerDefaultState()),
  // share the last emitted value among new subscribers
  shareReplay(1)
);

const setExplorerDataActionCreator = (payload: DeepPartial<ExplorerState>) => ({
  type: EXPLORER_ACTION.SET_EXPLORER_DATA,
  payload,
});

// Export observable state and action dispatchers as service
export const explorerServiceFactory = (mlFieldFormatService: MlFieldFormatService) => ({
  state$: explorerState$,
  clearExplorerData: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.CLEAR_EXPLORER_DATA });
  },
  clearInfluencerFilterSettings: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.CLEAR_INFLUENCER_FILTER_SETTINGS });
  },
  clearJobs: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.CLEAR_JOBS });
  },
  updateJobSelection: (selectedJobIds: string[]) => {
    explorerAction$.next(jobSelectionActionCreator(mlFieldFormatService, selectedJobIds));
  },
  setExplorerData: (payload: DeepPartial<ExplorerState>) => {
    explorerAction$.next(setExplorerDataActionCreator(payload));
  },
  setChartsDataLoading: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_CHARTS_DATA_LOADING });
  },
});

export type ExplorerService = ReturnType<typeof explorerServiceFactory>;
