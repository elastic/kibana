/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ML_APP_URL_GENERATOR = 'ML_APP_URL_GENERATOR';

export const ML_PAGES = {
  ANOMALY_DETECTION_JOBS_MANAGE: 'jobs',
  ANOMALY_EXPLORER: 'explorer',
  SINGLE_METRIC_VIEWER: 'timeseriesexplorer',
  DATA_FRAME_ANALYTICS_JOBS_MANAGE: 'data_frame_analytics',
  DATA_FRAME_ANALYTICS_MODELS_MANAGE: 'data_frame_analytics/models',
  DATA_FRAME_ANALYTICS_EXPLORATION: 'data_frame_analytics/exploration',
  DATA_FRAME_ANALYTICS_MAP: 'data_frame_analytics/map',
  /**
   * Page: Data Visualizer
   */
  DATA_VISUALIZER: 'datavisualizer',
  /**
   * Page: Data Visualizer
   * Open data visualizer by selecting a Kibana index pattern or saved search
   */
  DATA_VISUALIZER_INDEX_SELECT: 'datavisualizer_index_select',
  /**
   * Page: Data Visualizer
   * Open data visualizer by importing data from a log file
   */
  DATA_VISUALIZER_FILE: 'filedatavisualizer',
  /**
   * Page: Data Visualizer
   * Open index data visualizer viewer page
   */
  DATA_VISUALIZER_INDEX_VIEWER: 'jobs/new_job/datavisualizer',
  ANOMALY_DETECTION_CREATE_JOB: `jobs/new_job`,
  ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE: `jobs/new_job/step/job_type`,
  ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX: `jobs/new_job/step/index_or_search`,
  SETTINGS: 'settings',
  CALENDARS_MANAGE: 'settings/calendars_list',
  CALENDARS_NEW: 'settings/calendars_list/new_calendar',
  CALENDARS_EDIT: 'settings/calendars_list/edit_calendar',
  FILTER_LISTS_MANAGE: 'settings/filter_lists',
  FILTER_LISTS_NEW: 'settings/filter_lists/new_filter_list',
  FILTER_LISTS_EDIT: 'settings/filter_lists/edit_filter_list',
  ACCESS_DENIED: 'access-denied',
  OVERVIEW: 'overview',
} as const;

export type MlPages = typeof ML_PAGES[keyof typeof ML_PAGES];
