/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatHumanReadableDateTime } from '../../../../../common/util/date_utils';

import { getDefaultChartsData } from '../../explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION, VIEW_BY_JOB_LABEL } from '../../explorer_constants';
import { Action } from '../../explorer_dashboard_service';
import {
  getClearedSelectedAnomaliesState,
  getSwimlaneBucketInterval,
  getViewBySwimlaneOptions,
} from '../../explorer_utils';

import { clearInfluencerFilterSettings } from './clear_influencer_filter_settings';
import { jobSelectionChange } from './job_selection_change';
import { ExplorerState, getExplorerDefaultState } from './state';
import { setKqlQueryBarPlaceholder } from './set_kql_query_bar_placeholder';

export const explorerReducer = (state: ExplorerState, nextAction: Action): ExplorerState => {
  const { type, payload } = nextAction;

  let nextState: ExplorerState;

  switch (type) {
    case EXPLORER_ACTION.CLEAR_EXPLORER_DATA:
      nextState = getExplorerDefaultState();
      break;

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

    case EXPLORER_ACTION.SET_CHARTS_DATA_LOADING:
      nextState = {
        ...state,
        anomalyChartsDataLoading: true,
        chartsData: getDefaultChartsData(),
      };
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
          errorMessages: payload.errorMessages,
        },
      };
      break;

    case EXPLORER_ACTION.SET_EXPLORER_DATA:
      nextState = { ...state, ...payload };
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

    case EXPLORER_ACTION.SET_SHOW_CHARTS:
      nextState = {
        ...state,
        showCharts: payload,
      };
      break;

    default:
      nextState = state;
  }

  if (nextState.selectedJobs === null) {
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
  });

  // const { selectedCells } = nextState;

  // const timeRange = getTimeBoundsFromSelection(selectedCells);

  return {
    ...nextState,
    swimlaneBucketInterval,
    // viewByLoadedForTimeFormatted: timeRange
    //   ? `${formatHumanReadableDateTime(timeRange.earliestMs)} - ${formatHumanReadableDateTime(
    //       timeRange.latestMs
    //     )}`
    //   : null,
    // ...checkSelectedCells(nextState),
    ...setKqlQueryBarPlaceholder(nextState),
  };
};
