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
import type { DeepPartial } from '@kbn/utility-types';
import { jobSelectionActionCreator } from './actions';
import { EXPLORER_ACTION } from './explorer_constants';
import type { ExplorerState } from './reducers';
import { explorerReducer, getExplorerDefaultState } from './reducers';
import type { MlFieldFormatService } from '../services/field_format_service';
import type { MlJobService } from '../services/job_service';
import type { ExplorerJob } from './explorer_utils';

type ExplorerActionType = (typeof EXPLORER_ACTION)[keyof typeof EXPLORER_ACTION];

interface ExplorerActionPayloads {
  [EXPLORER_ACTION.SET_EXPLORER_DATA]: DeepPartial<ExplorerState>;
  [EXPLORER_ACTION.JOB_SELECTION_CHANGE]: {
    loading: boolean;
    selectedJobs: ExplorerJob[];
    noInfluencersConfigured: boolean;
  };
}

export type ExplorerActions = {
  [K in ExplorerActionType]: K extends keyof ExplorerActionPayloads
    ? {
        type: K;
        payload: ExplorerActionPayloads[K];
      }
    : {
        type: K;
      };
}[ExplorerActionType];

type ExplorerAction = ExplorerActions | Observable<ExplorerActions | null>;

export const explorerAction$ = new Subject<ExplorerAction>();

const explorerFilteredAction$ = explorerAction$.pipe(
  // consider observables as side-effects
  flatMap((action: ExplorerAction) =>
    isObservable(action) ? action : (from([action]) as Observable<ExplorerActions>)
  ),
  distinctUntilChanged(isEqual)
);

// applies action and returns state
const explorerState$: Observable<ExplorerState> = explorerFilteredAction$.pipe(
  scan(explorerReducer, getExplorerDefaultState()),
  // share the last emitted value among new subscribers
  shareReplay(1)
);

// Export observable state and action dispatchers as service
export const explorerServiceFactory = (
  mlJobService: MlJobService,
  mlFieldFormatService: MlFieldFormatService
) => ({
  state$: explorerState$,
  clearExplorerData: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.CLEAR_EXPLORER_DATA });
  },
  clearInfluencerFilterSettings: () => {
    explorerAction$.next({
      type: EXPLORER_ACTION.CLEAR_INFLUENCER_FILTER_SETTINGS,
    });
  },
  clearJobs: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.CLEAR_JOBS });
  },
  updateJobSelection: (selectedJobIds: string[]) => {
    explorerAction$.next(
      jobSelectionActionCreator(mlJobService, mlFieldFormatService, selectedJobIds)
    );
  },
  setExplorerData: (payload: DeepPartial<ExplorerState>) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_EXPLORER_DATA, payload });
  },
  setChartsDataLoading: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_CHARTS_DATA_LOADING });
  },
});

export type ExplorerService = ReturnType<typeof explorerServiceFactory>;
