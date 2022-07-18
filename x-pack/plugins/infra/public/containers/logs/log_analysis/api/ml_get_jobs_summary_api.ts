/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import type { HttpHandler } from '@kbn/core/public';

import { getJobId, jobCustomSettingsRT } from '../../../../../common/log_analysis';
import { decodeOrThrow } from '../../../../../common/runtime_types';

interface RequestArgs<JobType extends string> {
  spaceId: string;
  sourceId: string;
  jobTypes: JobType[];
}

export const callJobsSummaryAPI = async <JobType extends string>(
  requestArgs: RequestArgs<JobType>,
  fetch: HttpHandler
) => {
  const { spaceId, sourceId, jobTypes } = requestArgs;
  const response = await fetch('/api/ml/jobs/jobs_summary', {
    method: 'POST',
    body: JSON.stringify(
      fetchJobStatusRequestPayloadRT.encode({
        jobIds: jobTypes.map((jobType) => getJobId(spaceId, sourceId, jobType)),
      })
    ),
  });
  return decodeOrThrow(fetchJobStatusResponsePayloadRT)(response);
};

export const fetchJobStatusRequestPayloadRT = rt.type({
  jobIds: rt.array(rt.string),
});

export type FetchJobStatusRequestPayload = rt.TypeOf<typeof fetchJobStatusRequestPayloadRT>;

const datafeedStateRT = rt.keyof({
  started: null,
  starting: null,
  stopped: null,
  stopping: null,
  '': null,
});

// this is the union of the ML API's job state and block reasons
const jobStateRT = rt.keyof({
  closed: null,
  closing: null,
  deleting: null,
  failed: null,
  opened: null,
  opening: null,
  resetting: null,
  reverting: null,
});

const jobAnalysisConfigRT = rt.partial({
  per_partition_categorization: rt.intersection([
    rt.type({
      enabled: rt.boolean,
    }),
    rt.partial({
      stop_on_warn: rt.boolean,
    }),
  ]),
});

const jobCategorizationStatusRT = rt.keyof({
  ok: null,
  warn: null,
});

const jobModelSizeStatsRT = rt.type({
  categorization_status: jobCategorizationStatusRT,
  categorized_doc_count: rt.number,
  dead_category_count: rt.number,
  frequent_category_count: rt.number,
  log_time: rt.number,
  rare_category_count: rt.number,
  total_category_count: rt.number,
});

export type JobModelSizeStats = rt.TypeOf<typeof jobModelSizeStatsRT>;

export const jobSummaryRT = rt.intersection([
  rt.type({
    id: rt.string,
    jobState: jobStateRT,
  }),
  rt.partial({
    awaitingNodeAssignment: rt.boolean,
    datafeedIndices: rt.array(rt.string),
    datafeedState: datafeedStateRT,
    fullJob: rt.partial({
      analysis_config: jobAnalysisConfigRT,
      create_time: rt.number,
      custom_settings: jobCustomSettingsRT,
      finished_time: rt.number,
      model_size_stats: jobModelSizeStatsRT,
      datafeed_config: rt.partial({
        runtime_mappings: rt.UnknownRecord,
      }),
    }),
  }),
]);

export type JobSummary = rt.TypeOf<typeof jobSummaryRT>;

export const fetchJobStatusResponsePayloadRT = rt.array(jobSummaryRT);

export type FetchJobStatusResponsePayload = rt.TypeOf<typeof fetchJobStatusResponsePayloadRT>;
