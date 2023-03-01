/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseInterval } from '@kbn/ml-plugin/common/util/parse_interval';
import { ApmMlJob } from './apm_ml_job';

const FALLBACK_ML_BUCKET_SPAN = 15; // minutes

export function getMlBucketSizeInSeconds({ jobs }: { jobs: ApmMlJob[] }) {
  // find the first job with valid running datafeed
  const preferredBucketSpan = jobs.find(
    (j) => j.datafeedState !== undefined
  )?.bucketSpan;

  const minBucketSize =
    parseInterval(
      preferredBucketSpan ?? `${FALLBACK_ML_BUCKET_SPAN}m`
    )?.asSeconds() ?? FALLBACK_ML_BUCKET_SPAN * 60; // secs

  return minBucketSize;
}
