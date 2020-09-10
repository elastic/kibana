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
  | { type: 'initializing' } // acquiring job statuses to determine setup status
  | { type: 'unknown' } // job status could not be acquired (failed request etc)
  | { type: 'required' } // setup required
  | { type: 'pending' } // In the process of setting up the module for the first time or retrying, waiting for response
  | { type: 'succeeded' } // setup succeeded, notifying user
  | {
      type: 'failed';
      reasons: string[];
    } // setup failed, notifying user
  | {
      type: 'skipped';
      newlyCreated?: boolean;
    }; // setup is not necessary

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
  setupStatus.type === 'skipped';

const KIBANA_SAMPLE_DATA_INDICES = ['kibana_sample_data_logs*'];

export const isExampleDataIndex = (indexName: string) =>
  KIBANA_SAMPLE_DATA_INDICES.includes(indexName);
