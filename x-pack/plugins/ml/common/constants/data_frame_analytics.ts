/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANALYSIS_CONFIG_TYPE = {
  OUTLIER_DETECTION: 'outlier_detection',
  REGRESSION: 'regression',
  CLASSIFICATION: 'classification',
} as const;

export const DATA_FRAME_TASK_STATE = {
  ANALYZING: 'analyzing',
  FAILED: 'failed',
  REINDEXING: 'reindexing',
  STARTED: 'started',
  STARTING: 'starting',
  STOPPED: 'stopped',
} as const;

export const DEFAULT_RESULTS_FIELD = 'ml';

export const JOB_MAP_NODE_TYPES = {
  ANALYTICS: 'analytics',
  TRANSFORM: 'transform',
  INDEX: 'index',
  TRAINED_MODEL: 'trainedModel',
} as const;

export type JobMapNodeTypes = typeof JOB_MAP_NODE_TYPES[keyof typeof JOB_MAP_NODE_TYPES];
