/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmMlDetectorType } from '../../common/anomaly_detection/apm_ml_detectors';
import { getPreferredServiceAnomalyTimeseries } from '../../common/anomaly_detection/get_preferred_service_anomaly_timeseries';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useEnvironmentsContext } from '../context/environments_context/use_environments_context';
import { useServiceAnomalyTimeseriesContext } from '../context/service_anomaly_timeseries/use_service_anomaly_timeseries_context';

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
