/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';

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

interface StatusReducerState<JobType extends string> {
  jobStatus: Record<JobType, JobStatus>;
  jobSummaries: JobSummary[];
  lastSetupErrorMessages: string[];
  setupStatus: SetupStatus;
}

type StatusReducerAction =
  | { type: 'startedSetup' }
  | {
      type: 'finishedSetup';
      sourceId: string;
      spaceId: string;
      jobSetupResults: SetupMlModuleResponsePayload['jobs'];
      jobSummaries: FetchJobStatusResponsePayload;
      datafeedSetupResults: SetupMlModuleResponsePayload['datafeeds'];
    }
  | { type: 'failedSetup' }
  | { type: 'fetchingJobStatuses' }
  | {
      type: 'fetchedJobStatuses';
      spaceId: string;
      sourceId: string;
      payload: FetchJobStatusResponsePayload;
    }
  | { type: 'failedFetchingJobStatuses' }
  | { type: 'viewedResults' };

const createInitialState = <JobType extends string>({
  jobTypes,
}: {
  jobTypes: JobType[];
}): StatusReducerState<JobType> => ({
  jobStatus: jobTypes.reduce(
    (accumulatedJobStatus, jobType) => ({
      ...accumulatedJobStatus,
      [jobType]: 'unknown',
    }),
    {} as Record<JobType, JobStatus>
  ),
  jobSummaries: [],
  lastSetupErrorMessages: [],
  setupStatus: { type: 'initializing' },
});

const createStatusReducer =
  <JobType extends string>(jobTypes: JobType[]) =>
  (
    state: StatusReducerState<JobType>,
    action: StatusReducerAction
  ): StatusReducerState<JobType> => {
    switch (action.type) {
      case 'startedSetup': {
        return {
          ...state,
          jobStatus: jobTypes.reduce(
            (accumulatedJobStatus, jobType) => ({
              ...accumulatedJobStatus,
              [jobType]: 'initializing',
            }),
            {} as Record<JobType, JobStatus>
          ),
          setupStatus: { type: 'pending' },
        };
      }
      case 'finishedSetup': {
        const { datafeedSetupResults, jobSetupResults, jobSummaries, spaceId, sourceId } = action;
        const nextJobStatus = jobTypes.reduce(
          (accumulatedJobStatus, jobType) => ({
            ...accumulatedJobStatus,
            [jobType]:
              hasSuccessfullyCreatedJob(getJobId(spaceId, sourceId, jobType))(jobSetupResults) &&
              hasSuccessfullyStartedDatafeed(getDatafeedId(spaceId, sourceId, jobType))(
                datafeedSetupResults
              )
                ? 'started'
                : 'failed',
          }),
          {} as Record<JobType, JobStatus>
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
            {} as Record<JobType, JobStatus>
          ),
          setupStatus: { type: 'failed', reasons: ['unknown'] },
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
        const { payload: jobSummaries, spaceId, sourceId } = action;
        const { setupStatus } = state;

        const nextJobStatus = jobTypes.reduce(
          (accumulatedJobStatus, jobType) => ({
            ...accumulatedJobStatus,
            [jobType]: getJobStatus(getJobId(spaceId, sourceId, jobType))(jobSummaries),
          }),
          {} as Record<JobType, JobStatus>
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
            {} as Record<JobType, JobStatus>
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
  <JobType extends string>(everyJobStatus: Record<JobType, JobStatus>) =>
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

export const useModuleStatus = <JobType extends string>(jobTypes: JobType[]) => {
  return useReducer(createStatusReducer(jobTypes), { jobTypes }, createInitialState);
};
