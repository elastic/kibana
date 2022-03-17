/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmMlDetectorType } from '../../common/anomaly_detection/apm_ml_detectors';
import { Environment } from '../../common/environment_rt';
import { ServiceAnomalyTimeseries } from '../../common/anomaly_detection/service_anomaly_timeseries';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useEnvironmentsContext } from '../context/environments_context/use_environments_context';
import { useServiceAnomalyTimeseriesContext } from '../context/service_anomaly_timeseries/use_service_anomaly_timeseries_context';

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
      serie.environment === environment &&
      (fallbackToTransactions ? serie.version <= 2 : serie.version >= 3)
  );
}

export function usePreferredServiceAnomalyTimeseries(
  detectorType: ApmMlDetectorType
) {
  const { allAnomalyTimeseries } = useServiceAnomalyTimeseriesContext();

  const { environment } = useEnvironmentsContext();

  const { fallbackToTransactions } = useApmServiceContext();

  return getPreferredServiceAnomalyTimeseries({
    environment,
    fallbackToTransactions,
    detectorType,
    allAnomalyTimeseries,
  });
}
