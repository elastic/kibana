/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  CLEAR_INFLUENCER_FILTER_SETTINGS: 'clearInfluencerFilterSettings',
  CLEAR_JOBS: 'clearJobs',
  JOB_SELECTION_CHANGE: 'jobSelectionChange',
  SET_BOUNDS: 'setBounds',
  SET_CHARTS: 'setCharts',
  SET_EXPLORER_DATA: 'setExplorerData',
  SET_FILTER_DATA: 'setFilterData',
  SET_INFLUENCER_FILTER_SETTINGS: 'setInfluencerFilterSettings',
  SET_SELECTED_CELLS: 'setSelectedCells',
  SET_SWIMLANE_CONTAINER_WIDTH: 'setSwimlaneContainerWidth',
  SET_VIEW_BY_SWIMLANE_FIELD_NAME: 'setViewBySwimlaneFieldName',
  SET_VIEW_BY_SWIMLANE_LOADING: 'setViewBySwimlaneLoading',
  SET_VIEW_BY_PER_PAGE: 'setViewByPerPage',
  SET_VIEW_BY_FROM_PAGE: 'setViewByFromPage',
};

export const FILTER_ACTION = {
  ADD: '+',
  REMOVE: '-',
};

export const SWIMLANE_TYPE = {
  OVERALL: 'overall',
  VIEW_BY: 'viewBy',
} as const;

export type SwimlaneType = typeof SWIMLANE_TYPE[keyof typeof SWIMLANE_TYPE];

export const CHART_TYPE = {
  EVENT_DISTRIBUTION: 'event_distribution',
  POPULATION_DISTRIBUTION: 'population_distribution',
  SINGLE_METRIC: 'single_metric',
};

export const MAX_CATEGORY_EXAMPLES = 10;

/**
 * Maximum amount of top influencer to fetch.
 */
export const MAX_INFLUENCER_FIELD_VALUES = 10;
export const MAX_INFLUENCER_FIELD_NAMES = 50;

export const VIEW_BY_JOB_LABEL = i18n.translate('xpack.ml.explorer.jobIdLabel', {
  defaultMessage: 'job ID',
});
/**
 * Hard limitation for the size of terms
 * aggregations on influencers values.
 */
export const ANOMALY_SWIM_LANE_HARD_LIMIT = 1000;

/**
 * Default page size fot the anomaly swim lane.
 */
export const SWIM_LANE_DEFAULT_PAGE_SIZE = 10;
