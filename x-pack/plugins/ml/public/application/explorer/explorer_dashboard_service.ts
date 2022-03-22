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
import { from, isObservable, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, flatMap, scan, shareReplay } from 'rxjs/operators';
import { DeepPartial } from '../../../common/types/common';
import { jobSelectionActionCreator } from './actions';
import type { ExplorerChartsData } from './explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION } from './explorer_constants';
import { explorerReducer, getExplorerDefaultState, ExplorerState } from './reducers';

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
export const explorerService = {
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
    explorerAction$.next(jobSelectionActionCreator(selectedJobIds));
  },
  setCharts: (payload: ExplorerChartsData) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_CHARTS, payload });
  },
  setExplorerData: (payload: DeepPartial<ExplorerState>) => {
    explorerAction$.next(setExplorerDataActionCreator(payload));
  },
  setChartsDataLoading: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_CHARTS_DATA_LOADING });
  },
};

export type ExplorerService = typeof explorerService;
