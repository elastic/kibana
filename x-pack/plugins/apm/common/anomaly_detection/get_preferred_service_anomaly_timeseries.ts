/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEnvironmentLabel } from '../environment_filter_values';
import { Environment } from '../environment_rt';
import { ApmMlDetectorType } from './apm_ml_detectors';
import { ServiceAnomalyTimeseries } from './service_anomaly_timeseries';

export function getPreferredServiceAnomalyTimeseries({
  environment,
  detectorType,
  allAnomalyTimeseries,
  fallbackToTransactions,
}: {
  environment: Environment;
  detectorType: ApmMlDetectorType;
  allAnomalyTimeseries: ServiceAnomalyTimeseries[];
  fallbackToTransactions: boolean;
}) {
  const seriesForType = allAnomalyTimeseries.filter(
    (serie) => serie.type === detectorType
  );

  return seriesForType.find(
    (serie) =>
      serie.environment === getEnvironmentLabel(environment) &&
      (fallbackToTransactions ? serie.version <= 2 : serie.version >= 3)
  );
}
