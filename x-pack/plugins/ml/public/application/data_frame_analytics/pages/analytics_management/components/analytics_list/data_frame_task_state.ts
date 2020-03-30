/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// DATA_FRAME_TASK_STATE is used by x-pack functional test setup/config
// and that config cannot import from './common.ts' because it has imports dependant on a browser-environment

export enum DATA_FRAME_TASK_STATE {
  ANALYZING = 'analyzing',
  FAILED = 'failed',
  REINDEXING = 'reindexing',
  STARTED = 'started',
  STARTING = 'starting',
  STOPPED = 'stopped',
}
