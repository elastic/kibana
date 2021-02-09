/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../../hooks/use_fetcher';

export function useAnomalyDetectionJobsFetcher() {
  const { data, status } = useFetcher(
    (callApmApi) =>
      callApmApi({
        endpoint: `GET /api/apm/settings/anomaly-detection/jobs`,
      }),
    [],
    { showToastOnError: false }
  );

  return { anomalyDetectionJobsData: data, anomalyDetectionJobsStatus: status };
}
