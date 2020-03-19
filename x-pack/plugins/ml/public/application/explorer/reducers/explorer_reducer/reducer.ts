/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatHumanReadableDateTime } from '../../../util/date_utils';

import { getDefaultChartsData } from '../../explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION, VIEW_BY_JOB_LABEL } from '../../explorer_constants';
import { Action } from '../../explorer_dashboard_service';
import {
  getClearedSelectedAnomaliesState,
  getDefaultSwimlaneData,
  getSelectionTimeRange,
  getSwimlaneBucketInterval,
  getViewBySwimlaneOptions,
} from '../../explorer_utils';

import { checkSelectedCells } from './check_selected_cells';
import { clearInfluencerFilterSettings } from './clear_influencer_filter_settings';
import { jobSelectionChange } from './job_selection_change';
import { ExplorerState } from './state';
import { setInfluencerFilterSettings } from './set_influencer_filter_settings';
import { setKqlQueryBarPlaceholder } from './set_kql_query_bar_placeholder';

export const explorerReducer = (state: ExplorerState, nextAction: Action): ExplorerState => {
  const { type, payload } = nextAction;

  let nextState;

  switch (type) {
    case EXPLORER_ACTION.CLEAR_INFLUENCER_FILTER_SETTINGS:
      nextState = clearInfluencerFilterSettings(state);
      break;

    case EXPLORER_ACTION.CLEAR_JOBS:
      nextState = {
        ...state,
        ...getClearedSelectedAnomaliesState(),
        loading: false,
        selectedJobs: [],
      };
      break;

    case EXPLORER_ACTION.JOB_SELECTION_CHANGE:
      nextState = jobSelectionChange(state, payload);
      break;

    case EXPLORER_ACTION.SET_BOUNDS:
      nextState = { ...state, bounds: payload };
      break;

    case EXPLORER_ACTION.SET_CHARTS:
      nextState = {
        ...state,
        chartsData: {
          ...getDefaultChartsData(),
          chartsPerRow: payload.chartsPerRow,
          seriesToPlot: payload.seriesToPlot,
          // convert truthy/falsy value to Boolean
          tooManyBuckets: !!payload.tooManyBuckets,
        },
      };
      break;

    case EXPLORER_ACTION.SET_INFLUENCER_FILTER_SETTINGS:
      nextState = setInfluencerFilterSettings(state, payload);
      break;

    case EXPLORER_ACTION.SET_SELECTED_CELLS:
      const selectedCells = payload;
      nextState = {
        ...state,
        selectedCells,
      };
      break;

    case EXPLORER_ACTION.SET_EXPLORER_DATA:
    case EXPLORER_ACTION.SET_FILTER_DATA:
      nextState = { ...state, ...payload };
      break;

    case EXPLORER_ACTION.SET_SWIMLANE_CONTAINER_WIDTH:
      if (state.noInfluencersConfigured === true) {
        // swimlane is full width, minus 30 for the 'no influencers' info icon,
        // minus 170 for the lane labels, minus 50 padding
        nextState = { ...state, swimlaneContainerWidth: payload - 250 };
      } else {
        // swimlane width is 5 sixths of the window,
        // minus 170 for the lane labels, minus 50 padding
        nextState = { ...state, swimlaneContainerWidth: (payload / 6) * 5 - 220 };
      }
      break;

    case EXPLORER_ACTION.SET_SWIMLANE_LIMIT:
      nextState = {
        ...state,
        swimlaneLimit: payload,
      };
      break;

    case EXPLORER_ACTION.SET_VIEW_BY_SWIMLANE_FIELD_NAME:
      const { filteredFields, influencersFilterQuery } = state;
      const viewBySwimlaneFieldName = payload;

      let maskAll = false;

      if (influencersFilterQuery !== undefined) {
        maskAll =
          viewBySwimlaneFieldName === VIEW_BY_JOB_LABEL ||
          filteredFields.includes(viewBySwimlaneFieldName) === false;
      }

      nextState = {
        ...state,
        ...getClearedSelectedAnomaliesState(),
        maskAll,
        viewBySwimlaneFieldName,
      };
      break;

    case EXPLORER_ACTION.SET_VIEW_BY_SWIMLANE_LOADING:
      const { annotationsData, overallState, tableData } = payload;
      nextState = {
        ...state,
        annotationsData,
        ...overallState,
        tableData,
        viewBySwimlaneData: {
          ...getDefaultSwimlaneData(),
        },
        viewBySwimlaneDataLoading: true,
      };
      break;

    default:
      nextState = state;
  }

  if (nextState.selectedJobs === null || nextState.bounds === undefined) {
    return nextState;
  }

  const swimlaneBucketInterval = getSwimlaneBucketInterval(
    nextState.selectedJobs,
    nextState.swimlaneContainerWidth
  );

  // Does a sanity check on the selected `viewBySwimlaneFieldName`
  // and returns the available `viewBySwimlaneOptions`.
  const { viewBySwimlaneFieldName, viewBySwimlaneOptions } = getViewBySwimlaneOptions({
    currentViewBySwimlaneFieldName: nextState.viewBySwimlaneFieldName,
    filterActive: nextState.filterActive,
    filteredFields: nextState.filteredFields,
    isAndOperator: nextState.isAndOperator,
    selectedJobs: nextState.selectedJobs,
    selectedCells: nextState.selectedCells,
  });

  const { bounds, selectedCells } = nextState;

  const timerange = getSelectionTimeRange(
    selectedCells,
    swimlaneBucketInterval.asSeconds(),
    bounds
  );

  return {
    ...nextState,
    swimlaneBucketInterval,
    viewByLoadedForTimeFormatted:
      selectedCells !== undefined && selectedCells.showTopFieldValues === true
        ? formatHumanReadableDateTime(timerange.earliestMs)
        : null,
    viewBySwimlaneFieldName,
    viewBySwimlaneOptions,
    ...checkSelectedCells(nextState),
    ...setKqlQueryBarPlaceholder(nextState),
  };
};
