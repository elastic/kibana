/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum LoadingState {
  Loading,
  Success,
  Error,
}

export type LevelFilterOption = 'all' | 'critical';

export enum GroupByOption {
  message = 'message',
  index = 'index',
  node = 'node',
}

export type DeprecationTableColumns = 'type' | 'index' | 'message' | 'correctiveAction';

export type Status = 'in_progress' | 'complete' | 'idle' | 'error';
