/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Environment } from '../environment_rt';
import { ApmMlDetectorType } from './apm_ml_detectors';
import { ApmMlJobResultWithTimeseries } from './apm_ml_job_result';

export function getPreferredServiceAnomalyTimeseries({
  preferredEnvironment,
  detectorType,
  allAnomalyTimeseries,
  fallbackToTransactions,
}: {
  preferredEnvironment: Environment;
  detectorType: ApmMlDetectorType;
  allAnomalyTimeseries: ApmMlJobResultWithTimeseries[];
  fallbackToTransactions: boolean;
}) {
  const seriesForType = allAnomalyTimeseries.filter(
    (serie) => serie.type === detectorType
  );

  return seriesForType.find(
    (serie) =>
      serie.job.environment === preferredEnvironment &&
      (fallbackToTransactions ? serie.job.version <= 2 : serie.job.version >= 3)
  );
}
