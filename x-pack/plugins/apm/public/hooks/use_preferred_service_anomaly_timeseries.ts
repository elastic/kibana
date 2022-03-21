/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
import { ApmMlDetectorType } from '../../common/anomaly_detection/apm_ml_detectors';
import { Environment } from '../../common/environment_rt';
import { ServiceAnomalyTimeseries } from '../../common/anomaly_detection/service_anomaly_timeseries';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useEnvironmentsContext } from '../context/environments_context/use_environments_context';
import { useServiceAnomalyTimeseriesContext } from '../context/service_anomaly_timeseries/use_service_anomaly_timeseries_context';

export function getPreferredServiceAnomalyTimeseries({
  environment,
  environments,
  detectorType,
  allAnomalyTimeseries,
  fallbackToTransactions,
}: {
  environment: Environment;
  environments: string[];
  detectorType: ApmMlDetectorType;
  allAnomalyTimeseries: ServiceAnomalyTimeseries[];
  fallbackToTransactions: boolean;
}) {
  const seriesForType = allAnomalyTimeseries.filter(
    (serie) => serie.type === detectorType
  );

  const preferredEnvironment =
    environment === ENVIRONMENT_ALL.value && environments.length === 1
      ? environments[0]
      : environment;

  return seriesForType.find(
    (serie) =>
      serie.environment === preferredEnvironment &&
      (fallbackToTransactions ? serie.version <= 2 : serie.version >= 3)
  );
}

export function usePreferredServiceAnomalyTimeseries(
  detectorType: ApmMlDetectorType
) {
  const { allAnomalyTimeseries } = useServiceAnomalyTimeseriesContext();

  const { environment, environments } = useEnvironmentsContext();

  const { fallbackToTransactions } = useApmServiceContext();

  return getPreferredServiceAnomalyTimeseries({
    environment,
    environments,
    fallbackToTransactions,
    detectorType,
    allAnomalyTimeseries,
  });
}
