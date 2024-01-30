/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';

import { IdFormat, JobType } from '../../../../common/http_api/latest';
import {
  JobStatus,
  getDatafeedId,
  getJobId,
  isJobStatusWithResults,
  SetupStatus,
} from '../../../../common/log_analysis';
import { FetchJobStatusResponsePayload, JobSummary } from './api/ml_get_jobs_summary_api';
import { SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { MandatoryProperty } from '../../../../common/utility_types';

interface StatusReducerState<T extends JobType> {
  jobStatus: Record<T, JobStatus>;
  jobSummaries: JobSummary[];
  lastSetupErrorMessages: string[];
  setupStatus: SetupStatus;
}

type StatusReducerAction =
  | { type: 'startedSetup' }
  | {
      type: 'finishedSetup';
      logViewId: string;
      spaceId: string;
      idFormat: IdFormat;
      jobSetupResults: SetupMlModuleResponsePayload['jobs'];
      jobSummaries: FetchJobStatusResponsePayload;
      datafeedSetupResults: SetupMlModuleResponsePayload['datafeeds'];
    }
  | { type: 'failedSetup'; reason?: string }
  | { type: 'fetchingJobStatuses' }
  | {
      type: 'fetchedJobStatuses';
      spaceId: string;
      logViewId: string;
      idFormat: IdFormat;
      payload: FetchJobStatusResponsePayload;
    }
  | { type: 'failedFetchingJobStatuses' }
  | { type: 'viewedResults' };

const createInitialState = <T extends JobType>({
  jobTypes,
}: {
  jobTypes: T[];
}): StatusReducerState<T> => ({
  jobStatus: jobTypes.reduce(
    (accumulatedJobStatus, jobType) => ({
      ...accumulatedJobStatus,
      [jobType]: 'unknown',
    }),
    {} as Record<T, JobStatus>
  ),
  jobSummaries: [],
  lastSetupErrorMessages: [],
  setupStatus: { type: 'initializing' },
});

const createStatusReducer =
  <T extends JobType>(jobTypes: T[]) =>
  (state: StatusReducerState<T>, action: StatusReducerAction): StatusReducerState<T> => {
    switch (action.type) {
      case 'startedSetup': {
        return {
          ...state,
          jobStatus: jobTypes.reduce(
            (accumulatedJobStatus, jobType) => ({
              ...accumulatedJobStatus,
              [jobType]: 'initializing',
            }),
            {} as Record<T, JobStatus>
          ),
          setupStatus: { type: 'pending' },
        };
      }
      case 'finishedSetup': {
        const {
          datafeedSetupResults,
          jobSetupResults,
          jobSummaries,
          spaceId,
          logViewId,
          idFormat,
        } = action;
        const nextJobStatus = jobTypes.reduce(
          (accumulatedJobStatus, jobType) => ({
            ...accumulatedJobStatus,
            [jobType]:
              hasSuccessfullyCreatedJob(getJobId(spaceId, logViewId, idFormat, jobType))(
                jobSetupResults
              ) &&
              hasSuccessfullyStartedDatafeed(getDatafeedId(spaceId, logViewId, idFormat, jobType))(
                datafeedSetupResults
              )
                ? 'started'
                : 'failed',
          }),
          {} as Record<T, JobStatus>
        );
        const nextSetupStatus: SetupStatus = Object.values<JobStatus>(nextJobStatus).every(
          (jobState) => jobState === 'started' || jobState === 'starting'
        )
          ? { type: 'succeeded' }
          : {
              type: 'failed',
              reasons: [
                ...Object.values(datafeedSetupResults)
                  .filter(hasError)
                  .map((datafeed) => datafeed.error.error?.reason),
                ...Object.values(jobSetupResults)
                  .filter(hasError)
                  .map((job) => job.error.error?.reason),
              ],
            };

        return {
          ...state,
          jobStatus: nextJobStatus,
          jobSummaries,
          setupStatus: nextSetupStatus,
        };
      }
      case 'failedSetup': {
        return {
          ...state,
          jobStatus: jobTypes.reduce(
            (accumulatedJobStatus, jobType) => ({
              ...accumulatedJobStatus,
              [jobType]: 'failed',
            }),
            {} as Record<T, JobStatus>
          ),
          setupStatus: { type: 'failed', reasons: action.reason ? [action.reason] : ['unknown'] },
        };
      }
      case 'fetchingJobStatuses': {
        return {
          ...state,
          setupStatus:
            state.setupStatus.type === 'unknown' ? { type: 'initializing' } : state.setupStatus,
        };
      }
      case 'fetchedJobStatuses': {
        const { payload: jobSummaries, spaceId, logViewId, idFormat } = action;
        const { setupStatus } = state;

        const nextJobStatus = jobTypes.reduce(
          (accumulatedJobStatus, jobType) => ({
            ...accumulatedJobStatus,
            [jobType]: getJobStatus(getJobId(spaceId, logViewId, idFormat, jobType))(jobSummaries),
          }),
          {} as Record<T, JobStatus>
        );
        const nextSetupStatus = getSetupStatus(nextJobStatus)(setupStatus);

        return {
          ...state,
          jobSummaries,
          jobStatus: nextJobStatus,
          setupStatus: nextSetupStatus,
        };
      }
      case 'failedFetchingJobStatuses': {
        return {
          ...state,
          setupStatus: { type: 'unknown' },
          jobStatus: jobTypes.reduce(
            (accumulatedJobStatus, jobType) => ({
              ...accumulatedJobStatus,
              [jobType]: 'unknown',
            }),
            {} as Record<T, JobStatus>
          ),
        };
      }
      case 'viewedResults': {
        return {
          ...state,
          setupStatus: { type: 'skipped', newlyCreated: true },
        };
      }
      default: {
        return state;
      }
    }
  };

const hasSuccessfullyCreatedJob =
  (jobId: string) => (jobSetupResponses: SetupMlModuleResponsePayload['jobs']) =>
    jobSetupResponses.filter(
      (jobSetupResponse) =>
        jobSetupResponse.id === jobId && jobSetupResponse.success && !jobSetupResponse.error
    ).length > 0;

const hasSuccessfullyStartedDatafeed =
  (datafeedId: string) => (datafeedSetupResponses: SetupMlModuleResponsePayload['datafeeds']) =>
    datafeedSetupResponses.filter(
      (datafeedSetupResponse) =>
        datafeedSetupResponse.id === datafeedId &&
        datafeedSetupResponse.success &&
        datafeedSetupResponse.started &&
        !datafeedSetupResponse.error
    ).length > 0;

const getJobStatus =
  (jobId: string) =>
  (jobSummaries: FetchJobStatusResponsePayload): JobStatus =>
    jobSummaries
      .filter((jobSummary) => jobSummary.id === jobId)
      .map((jobSummary): JobStatus => {
        if (jobSummary.jobState === 'failed' || jobSummary.datafeedState === '') {
          return 'failed';
        } else if (
          jobSummary.jobState === 'closed' &&
          jobSummary.datafeedState === 'stopped' &&
          jobSummary.fullJob &&
          jobSummary.fullJob.finished_time != null
        ) {
          return 'finished';
        } else if (
          jobSummary.jobState === 'closed' ||
          jobSummary.jobState === 'closing' ||
          jobSummary.datafeedState === 'stopped'
        ) {
          return 'stopped';
        } else if (
          (jobSummary.jobState === 'opening' && jobSummary.awaitingNodeAssignment === false) ||
          jobSummary.jobState === 'resetting' ||
          jobSummary.jobState === 'reverting'
        ) {
          return 'initializing';
        } else if (
          (jobSummary.jobState === 'opened' && jobSummary.datafeedState === 'started') ||
          (jobSummary.jobState === 'opening' &&
            jobSummary.datafeedState === 'starting' &&
            jobSummary.awaitingNodeAssignment === true)
        ) {
          return 'started';
        }

        return 'unknown';
      })[0] || 'missing';

const getSetupStatus =
  <T extends JobType>(everyJobStatus: Record<T, JobStatus>) =>
  (previousSetupStatus: SetupStatus): SetupStatus =>
    Object.entries<JobStatus>(everyJobStatus).reduce<SetupStatus>((setupStatus, [, jobStatus]) => {
      if (jobStatus === 'missing') {
        return { type: 'required' };
      } else if (setupStatus.type === 'required' || setupStatus.type === 'succeeded') {
        return setupStatus;
      } else if (setupStatus.type === 'skipped' || isJobStatusWithResults(jobStatus)) {
        return {
          type: 'skipped',
          // preserve newlyCreated status
          newlyCreated: setupStatus.type === 'skipped' && setupStatus.newlyCreated,
        };
      }

      return setupStatus;
    }, previousSetupStatus);

const hasError = <Value extends { error?: any }>(
  value: Value
): value is MandatoryProperty<Value, 'error'> => value.error != null;

export const useModuleStatus = <T extends JobType>(jobTypes: T[]) => {
  return useReducer(createStatusReducer(jobTypes), { jobTypes }, createInitialState);
};
