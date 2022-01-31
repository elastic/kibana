/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The status of the datafeed.
 */
export enum DATAFEED_STATE {
  STARTED = 'started',
  STARTING = 'starting',
  STOPPED = 'stopped',
  STOPPING = 'stopping',
  DELETED = 'deleted',
}

/**
 * The status of the anomaly detection job forecast.
 */
export enum FORECAST_REQUEST_STATE {
  FAILED = 'failed',
  FINISHED = 'finished',
  SCHEDULED = 'scheduled',
  STARTED = 'started',
}

/**
 * The status of the anomaly detection job.
 */
export enum JOB_STATE {
  CLOSED = 'closed',
  CLOSING = 'closing',
  FAILED = 'failed',
  OPENED = 'opened',
  OPENING = 'opening',
  DELETED = 'deleted',
}
