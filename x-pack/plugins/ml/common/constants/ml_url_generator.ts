/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ML_APP_URL_GENERATOR = 'ML_APP_URL_GENERATOR';

export const ML_PAGES = {
  ANOMALY_DETECTION: 'jobs',
  ANOMALY_EXPLORER: 'explorer',
  TIME_SERIES_EXPLORER: 'timeseriesexplorer',
  DATA_FRAME_ANALYTICS: 'data_frame_analytics',
  DATA_FRAME_ANALYTICS_EXPLORATION: 'data_frame_analytics/exploration',
  /**
   * Page: Data Visualizer
   */
  DATA_VISUALIZER: 'datavisualizer',
  /**
   * Page: Data Visualizer
   * Create data visualizer by selecting an existing Elasticsearch index
   */
  DATA_VISUALIZER_INDEX_SELECT: 'datavisualizer_index_select',
  /**
   * Page: Data Visualizer
   * Create data visualizer by importing log data
   */
  DATA_VISUALIZER_FILE: 'filedatavisualizer',
  /**
   * Page: Data Visualizer
   * Create a job from the index pattern
   */
  get DATA_VISUALIZER_INDEX_VIEWER() {
    return `${this.ANOMALY_DETECTION}/new_job/${this.DATA_VISUALIZER}`;
  },
  get DATA_VISUALIZER_NEW_JOB() {
    return `${this.ANOMALY_DETECTION}/new_job/step/job_type`;
  },
  SETTINGS: 'settings',
  CALENDARS: 'settings/calendars_list',
  FILTERS: 'settings/filter_lists',
} as const;
