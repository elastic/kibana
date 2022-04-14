/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEPLOYMENT_STATE = {
  STARTED: 'started',
  STARTING: 'starting',
  STOPPING: 'stopping',
} as const;

export type DeploymentState = typeof DEPLOYMENT_STATE[keyof typeof DEPLOYMENT_STATE];

export const TRAINED_MODEL_TYPE = {
  PYTORCH: 'pytorch',
  TREE_ENSEMBLE: 'tree_ensemble',
  LANG_IDENT: 'lang_ident',
} as const;
export type TrainedModelType = typeof TRAINED_MODEL_TYPE[keyof typeof TRAINED_MODEL_TYPE];

export const SUPPORTED_PYTORCH_TASKS = {
  NER: 'ner',
  ZERO_SHOT_CLASSIFICATION: 'zero_shot_classification',
  // CLASSIFICATION_LABELS: 'classification_labels',
  TEXT_CLASSIFICATION: 'text_classification',
  TEXT_EMBEDDING: 'text_embedding',
} as const;
export type SupportedPytorchTasksType =
  typeof SUPPORTED_PYTORCH_TASKS[keyof typeof SUPPORTED_PYTORCH_TASKS];
