/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOG_RATE_ANALYSIS_SETTINGS = {
  /**
   * The p-value threshold to be used for statistically significant items.
   */
  P_VALUE_THRESHOLD: 0.02,
  /**
   * The minimum support value to be used for the frequent item sets aggration.
   */
  FREQUENT_ITEMS_SETS_MINIMUM_SUPPORT: 0.001,
} as const;

/**
 * For the technical preview of Log Rate Analysis we use a hard coded seed.
 * In future versions we might use a user specific seed or let the user customise it.
 */
export const RANDOM_SAMPLER_SEED = 3867412;

export const CASES_ATTACHMENT_CHANGE_POINT_CHART = 'aiopsChangePointChart';

export const EMBEDDABLE_CHANGE_POINT_CHART_TYPE = 'aiopsChangePointChart' as const;

export type EmbeddableChangePointType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;

export const AIOPS_TELEMETRY_ID = {
  AIOPS_DEFAULT_SOURCE: 'ml_aiops_labs',
  AIOPS_ANALYSIS_RUN_ORIGIN: 'aiops-analysis-run-origin',
} as const;

export const EMBEDDABLE_ORIGIN = 'embeddable';

export const CHANGE_POINT_DETECTION_VIEW_TYPE = {
  CHARTS: 'charts',
  TABLE: 'table',
} as const;

export type ChangePointDetectionViewType =
  typeof CHANGE_POINT_DETECTION_VIEW_TYPE[keyof typeof CHANGE_POINT_DETECTION_VIEW_TYPE];
