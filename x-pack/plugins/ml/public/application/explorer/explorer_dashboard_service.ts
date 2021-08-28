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
import { distinctUntilChanged, flatMap, map, scan, shareReplay } from 'rxjs/operators';
import type { DeepPartial } from '../../../common/types/common';
import type { ExplorerAppState } from '../../../common/types/locator';
import { jobSelectionActionCreator } from './actions/job_selection';
import type { ExplorerChartsData } from './explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION } from './explorer_constants';
import type { AppStateSelectedCells } from './explorer_utils';
import { explorerReducer } from './reducers/explorer_reducer/reducer';
import type { ExplorerState } from './reducers/explorer_reducer/state';
import { getExplorerDefaultState } from './reducers/explorer_reducer/state';

export const ALLOW_CELL_RANGE_SELECTION = true;

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

const explorerAppState$: Observable<ExplorerAppState> = explorerState$.pipe(
  map(
    (state: ExplorerState): ExplorerAppState => {
      const appState: ExplorerAppState = {
        mlExplorerFilter: {},
        mlExplorerSwimlane: {},
      };

      if (state.selectedCells !== undefined) {
        const swimlaneSelectedCells = state.selectedCells;
        appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
        appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
        appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
        appState.mlExplorerSwimlane.showTopFieldValues = swimlaneSelectedCells.showTopFieldValues;
      }

      if (state.viewBySwimlaneFieldName !== undefined) {
        appState.mlExplorerSwimlane.viewByFieldName = state.viewBySwimlaneFieldName;
      }

      if (state.viewByFromPage !== undefined) {
        appState.mlExplorerSwimlane.viewByFromPage = state.viewByFromPage;
      }

      if (state.viewByPerPage !== undefined) {
        appState.mlExplorerSwimlane.viewByPerPage = state.viewByPerPage;
      }

      if (state.swimLaneSeverity !== undefined) {
        appState.mlExplorerSwimlane.severity = state.swimLaneSeverity;
      }

      if (state.filterActive) {
        appState.mlExplorerFilter.influencersFilterQuery = state.influencersFilterQuery;
        appState.mlExplorerFilter.filterActive = state.filterActive;
        appState.mlExplorerFilter.filteredFields = state.filteredFields;
        appState.mlExplorerFilter.queryString = state.queryString;
      }

      return appState;
    }
  ),
  distinctUntilChanged(isEqual)
);

const setExplorerDataActionCreator = (payload: DeepPartial<ExplorerState>) => ({
  type: EXPLORER_ACTION.SET_EXPLORER_DATA,
  payload,
});
const setFilterDataActionCreator = (
  payload: Partial<Exclude<ExplorerAppState['mlExplorerFilter'], undefined>>
) => ({
  type: EXPLORER_ACTION.SET_FILTER_DATA,
  payload,
});

// Export observable state and action dispatchers as service
export const explorerService = {
  appState$: explorerAppState$,
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
  setInfluencerFilterSettings: (payload: any) => {
    explorerAction$.next({
      type: EXPLORER_ACTION.SET_INFLUENCER_FILTER_SETTINGS,
      payload,
    });
  },
  setSelectedCells: (payload: AppStateSelectedCells | undefined) => {
    explorerAction$.next({
      type: EXPLORER_ACTION.SET_SELECTED_CELLS,
      payload,
    });
  },
  setExplorerData: (payload: DeepPartial<ExplorerState>) => {
    explorerAction$.next(setExplorerDataActionCreator(payload));
  },
  setFilterData: (payload: Partial<Exclude<ExplorerAppState['mlExplorerFilter'], undefined>>) => {
    explorerAction$.next(setFilterDataActionCreator(payload));
  },
  setChartsDataLoading: () => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_CHARTS_DATA_LOADING });
  },
  setSwimlaneContainerWidth: (payload: number) => {
    explorerAction$.next({
      type: EXPLORER_ACTION.SET_SWIMLANE_CONTAINER_WIDTH,
      payload,
    });
  },
  setViewBySwimlaneFieldName: (payload: string) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_VIEW_BY_SWIMLANE_FIELD_NAME, payload });
  },
  setViewBySwimlaneLoading: (payload: any) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_VIEW_BY_SWIMLANE_LOADING, payload });
  },
  setViewByFromPage: (payload: number) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_VIEW_BY_FROM_PAGE, payload });
  },
  setViewByPerPage: (payload: number) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_VIEW_BY_PER_PAGE, payload });
  },
  setSwimLaneSeverity: (payload: number) => {
    explorerAction$.next({ type: EXPLORER_ACTION.SET_SWIM_LANE_SEVERITY, payload });
  },
};

export type ExplorerService = typeof explorerService;
