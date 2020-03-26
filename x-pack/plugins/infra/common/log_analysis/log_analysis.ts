/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// combines and abstracts job and datafeed status
export type JobStatus =
  | 'unknown'
  | 'missing'
  | 'initializing'
  | 'stopped'
  | 'started'
  | 'finished'
  | 'failed';

export type SetupStatus =
  | 'initializing' // acquiring job statuses to determine setup status
  | 'unknown' // job status could not be acquired (failed request etc)
  | 'required' // jobs are missing
  | 'requiredForReconfiguration' // the configurations don't match the source configurations
  | 'requiredForUpdate' // the definitions don't match the module definitions
  | 'pending' // In the process of setting up the module for the first time or retrying, waiting for response
  | 'succeeded' // setup succeeded, notifying user
  | 'failed' // setup failed, notifying user
  | 'hiddenAfterSuccess' // hide the setup screen and we show the results for the first time
  | 'skipped' // setup hidden because the module is in a correct state already
  | 'skippedButReconfigurable' // setup hidden even though the job configurations are outdated
  | 'skippedButUpdatable'; // setup hidden even though the job definitions are outdated

/**
 * Maps a job status to the possibility that results have already been produced
 * before this state was reached.
 */
export const isJobStatusWithResults = (jobStatus: JobStatus) =>
  ['started', 'finished', 'stopped', 'failed'].includes(jobStatus);

export const isHealthyJobStatus = (jobStatus: JobStatus) =>
  ['started', 'finished'].includes(jobStatus);

/**
 * Maps a setup status to the possibility that results have already been
 * produced before this state was reached.
 */
export const isSetupStatusWithResults = (setupStatus: SetupStatus) =>
  ['skipped', 'hiddenAfterSuccess', 'skippedButReconfigurable', 'skippedButUpdatable'].includes(
    setupStatus
  );

const KIBANA_SAMPLE_DATA_INDICES = ['kibana_sample_data_logs*'];

export const isExampleDataIndex = (indexName: string) =>
  KIBANA_SAMPLE_DATA_INDICES.includes(indexName);
