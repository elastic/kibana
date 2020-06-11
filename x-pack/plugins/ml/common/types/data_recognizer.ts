/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const JobStatType = t.intersection([
  t.type({
    id: t.string,
    earliestTimestampMs: t.number,
    latestTimestampMs: t.number,
  }),
  t.partial({
    latestResultsTimestampMs: t.number,
  }),
]);

export type JobStat = t.TypeOf<typeof JobStatType>;

export const JobExistResultType = t.type({
  jobsExist: t.boolean,
  jobs: t.array(JobStatType),
});

export type JobExistResult = t.TypeOf<typeof JobExistResultType>;
