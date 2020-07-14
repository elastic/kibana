/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { npStart } from '../../../../legacy_singletons';

import { getJobId, jobCustomSettingsRT } from '../../../../../common/log_analysis';
import { createPlainError, throwErrors } from '../../../../../common/runtime_types';

export const callJobsSummaryAPI = async <JobType extends string>(
  spaceId: string,
  sourceId: string,
  jobTypes: JobType[]
) => {
  const response = await npStart.http.fetch('/api/ml/jobs/jobs_summary', {
    method: 'POST',
    body: JSON.stringify(
      fetchJobStatusRequestPayloadRT.encode({
        jobIds: jobTypes.map((jobType) => getJobId(spaceId, sourceId, jobType)),
      })
    ),
  });
  return pipe(
    fetchJobStatusResponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};

export const fetchJobStatusRequestPayloadRT = rt.type({
  jobIds: rt.array(rt.string),
});

export type FetchJobStatusRequestPayload = rt.TypeOf<typeof fetchJobStatusRequestPayloadRT>;

const datafeedStateRT = rt.keyof({
  started: null,
  stopped: null,
  stopping: null,
  '': null,
});

const jobStateRT = rt.keyof({
  closed: null,
  closing: null,
  deleting: null,
  failed: null,
  opened: null,
  opening: null,
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
    datafeedIndices: rt.array(rt.string),
    datafeedState: datafeedStateRT,
    fullJob: rt.partial({
      custom_settings: jobCustomSettingsRT,
      finished_time: rt.number,
      model_size_stats: jobModelSizeStatsRT,
    }),
  }),
]);

export type JobSummary = rt.TypeOf<typeof jobSummaryRT>;

export const fetchJobStatusResponsePayloadRT = rt.array(jobSummaryRT);

export type FetchJobStatusResponsePayload = rt.TypeOf<typeof fetchJobStatusResponsePayloadRT>;
