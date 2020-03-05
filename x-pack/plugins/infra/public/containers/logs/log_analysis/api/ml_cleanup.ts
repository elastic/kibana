/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { npStart } from '../../../../legacy_singletons';

import { getDatafeedId, getJobId } from '../../../../../common/log_analysis';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

export const callDeleteJobs = async <JobType extends string>(
  spaceId: string,
  sourceId: string,
  jobTypes: JobType[]
) => {
  // NOTE: Deleting the jobs via this API will delete the datafeeds at the same time
  const deleteJobsResponse = await npStart.http.fetch('/api/ml/jobs/delete_jobs', {
    method: 'POST',
    body: JSON.stringify(
      deleteJobsRequestPayloadRT.encode({
        jobIds: jobTypes.map(jobType => getJobId(spaceId, sourceId, jobType)),
      })
    ),
  });

  return pipe(
    deleteJobsResponsePayloadRT.decode(deleteJobsResponse),
    fold(throwErrors(createPlainError), identity)
  );
};

export const callGetJobDeletionTasks = async () => {
  const jobDeletionTasksResponse = await npStart.http.fetch('/api/ml/jobs/deleting_jobs_tasks');

  return pipe(
    getJobDeletionTasksResponsePayloadRT.decode(jobDeletionTasksResponse),
    fold(throwErrors(createPlainError), identity)
  );
};

export const callStopDatafeeds = async <JobType extends string>(
  spaceId: string,
  sourceId: string,
  jobTypes: JobType[]
) => {
  // Stop datafeed due to https://github.com/elastic/kibana/issues/44652
  const stopDatafeedResponse = await npStart.http.fetch('/api/ml/jobs/stop_datafeeds', {
    method: 'POST',
    body: JSON.stringify(
      stopDatafeedsRequestPayloadRT.encode({
        datafeedIds: jobTypes.map(jobType => getDatafeedId(spaceId, sourceId, jobType)),
      })
    ),
  });

  return pipe(
    stopDatafeedsResponsePayloadRT.decode(stopDatafeedResponse),
    fold(throwErrors(createPlainError), identity)
  );
};

export const deleteJobsRequestPayloadRT = rt.type({
  jobIds: rt.array(rt.string),
});

export type DeleteJobsRequestPayload = rt.TypeOf<typeof deleteJobsRequestPayloadRT>;

export const deleteJobsResponsePayloadRT = rt.record(
  rt.string,
  rt.type({
    deleted: rt.boolean,
  })
);

export type DeleteJobsResponsePayload = rt.TypeOf<typeof deleteJobsResponsePayloadRT>;

export const getJobDeletionTasksResponsePayloadRT = rt.type({
  jobIds: rt.array(rt.string),
});

export const stopDatafeedsRequestPayloadRT = rt.type({
  datafeedIds: rt.array(rt.string),
});

export const stopDatafeedsResponsePayloadRT = rt.record(
  rt.string,
  rt.type({
    stopped: rt.boolean,
  })
);
