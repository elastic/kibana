/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useFetcher } from './useFetcher';

export function useAnomalyDetectionJobs() {
  return useFetcher(
    (callApmApi) =>
      callApmApi({
        endpoint: `GET /api/apm/settings/anomaly-detection`,
      }),
    [],
    { showToastOnError: false }
  );
}
