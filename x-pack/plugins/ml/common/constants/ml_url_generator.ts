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
  DATA_FRAME_ANALYTICS_EXPLORATION: 'data_frame_analytics/exploration',
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
  ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE: `jobs/new_job/step/job_type`,
  SETTINGS: 'settings',
  CALENDARS_MANAGE: 'settings/calendars_list',
  FILTER_LISTS_MANAGE: 'settings/filter_lists',
} as const;
