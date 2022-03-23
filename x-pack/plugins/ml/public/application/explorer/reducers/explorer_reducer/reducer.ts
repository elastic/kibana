/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultChartsData } from '../../explorer_charts/explorer_charts_container_service';
import { EXPLORER_ACTION } from '../../explorer_constants';
import { Action } from '../../explorer_dashboard_service';
import { getClearedSelectedAnomaliesState } from '../../explorer_utils';

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

    default:
      nextState = state;
  }

  if (nextState.selectedJobs === null) {
    return nextState;
  }

  return {
    ...nextState,
    ...setKqlQueryBarPlaceholder(nextState),
  };
};
