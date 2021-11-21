/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'lodash';
import { ENVIRONMENT_ALL } from '../environment_filter_values';
import { Environment } from '../environment_rt';
import { ApmMlDetectorType } from './apm_ml_detectors';
import { ServiceAnomalyTimeseries } from './service_anomaly_timeseries';

export function getPreferredServiceAnomalyTimeseries({
  environment,
  environments,
  detectorType,
  allAnomalyTimeseries,
  fallbackToTransactions,
}: {
  environment: Environment;
  environments: Environment[];
  detectorType: ApmMlDetectorType;
  allAnomalyTimeseries: ServiceAnomalyTimeseries[];
  fallbackToTransactions: boolean;
}) {
  const seriesForType = allAnomalyTimeseries.filter(
    (serie) => serie.type === detectorType
  );

  if (environment === ENVIRONMENT_ALL.value) {
    return environments.length === 1
      ? seriesForType.find((serie) => serie.environment === first(environments))
      : undefined;
  }

  const preferred = seriesForType.find(
    (serie) => serie.environment === environment
  );

  return (!fallbackToTransactions && preferred?.version) ?? 0 >= 3
    ? preferred
    : undefined;
}
