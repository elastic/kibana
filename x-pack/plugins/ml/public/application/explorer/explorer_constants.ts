/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Contains values for ML anomaly explorer.
 */

import { i18n } from '@kbn/i18n';

export const DRAG_SELECT_ACTION = {
  NEW_SELECTION: 'newSelection',
  ELEMENT_SELECT: 'elementSelect',
  DRAG_START: 'dragStart',
} as const;

export const EXPLORER_ACTION = {
  CLEAR_EXPLORER_DATA: 'clearExplorerData',
  CLEAR_INFLUENCER_FILTER_SETTINGS: 'clearInfluencerFilterSettings',
  CLEAR_JOBS: 'clearJobs',
  JOB_SELECTION_CHANGE: 'jobSelectionChange',
  SET_CHARTS: 'setCharts',
  SET_CHARTS_DATA_LOADING: 'setChartsDataLoading',
  SET_EXPLORER_DATA: 'setExplorerData',
};

export const FILTER_ACTION = {
  ADD: '+',
  REMOVE: '-',
} as const;

export type FilterAction = typeof FILTER_ACTION[keyof typeof FILTER_ACTION];

export const SWIMLANE_TYPE = {
  OVERALL: 'overall',
  VIEW_BY: 'viewBy',
} as const;

export type SwimlaneType = typeof SWIMLANE_TYPE[keyof typeof SWIMLANE_TYPE];

export const CHART_TYPE = {
  EVENT_DISTRIBUTION: 'event_distribution',
  POPULATION_DISTRIBUTION: 'population_distribution',
  SINGLE_METRIC: 'single_metric',
  GEO_MAP: 'geo_map',
} as const;

export type ChartType = typeof CHART_TYPE[keyof typeof CHART_TYPE];

export const MAX_CATEGORY_EXAMPLES = 10;

/**
 * Maximum amount of top influencer to fetch.
 */
export const MAX_INFLUENCER_FIELD_VALUES = 10;
export const MAX_INFLUENCER_FIELD_NAMES = 50;

export const VIEW_BY_JOB_LABEL = i18n.translate('xpack.ml.explorer.jobIdLabel', {
  defaultMessage: 'job ID',
});

export const OVERALL_LABEL = i18n.translate('xpack.ml.explorer.overallLabel', {
  defaultMessage: 'Overall',
});

/**
 * Hard limitation for the size of terms
 * aggregations on influencers values.
 */
export const ANOMALY_SWIM_LANE_HARD_LIMIT = 1000;

/**
 * Default page size for the anomaly swim lane.
 */
export const SWIM_LANE_DEFAULT_PAGE_SIZE = 10;
