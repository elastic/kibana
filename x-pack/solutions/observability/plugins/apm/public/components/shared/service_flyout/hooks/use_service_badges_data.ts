/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAnomalyScoreResponse } from '@kbn/apm-api-shared';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { Environment } from '../../../../../common/environment_rt';
import { useServiceFlyoutContext } from '../service_flyout_context';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';

interface ServiceBadgesDataParams {
  serviceName: string;
  environment: Environment;
  rangeFrom: string;
  rangeTo: string;
}

interface ServiceBadgesData {
  alertsCount?: number;
  anomalyData?: ServiceAnomalyScoreResponse;
}

export function useServiceBadgesData({
  serviceName,
  environment,
  rangeFrom,
  rangeTo,
}: ServiceBadgesDataParams): ServiceBadgesData {
  const {
    deps: { core, alerting },
  } = useServiceFlyoutContext();
  const { capabilities } = core.application;
  const { canReadAlerts } = getAlertingCapabilities({ alerting }, capabilities);
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const canReadMlJobs = !!capabilities.ml?.canGetJobs;

  const { data: alertsData, status: alertsStatus } = useFetcher(
    (callApmApi) => {
      if (!canReadAlerts || !start || !end) return;

      return callApmApi('GET /internal/apm/services/{serviceName}/alerts_count', {
        params: {
          path: { serviceName },
          query: { start, end, environment },
        },
      })
        .then((res) => ({ alertsCount: res.alertsCount }))
        .catch((): { alertsCount?: number } => ({}));
    },
    [serviceName, start, end, environment, canReadAlerts],
    { showToastOnError: false }
  );

  const { data: anomalyData, status: anomalyStatus } = useFetcher(
    (callApmApi) => {
      if (!canReadMlJobs || !start || !end) return;

      return callApmApi('GET /internal/apm/services/{serviceName}/anomaly_score', {
        params: {
          path: { serviceName },
          query: { start, end, environment },
        },
      })
        .then((res) => res)
        .catch((): Partial<ServiceAnomalyScoreResponse> => ({}));
    },
    [serviceName, start, end, environment, canReadMlJobs],
    { showToastOnError: false }
  );

  const alertsResolved = alertsStatus === FETCH_STATUS.SUCCESS;
  const alertsCount = alertsResolved ? alertsData?.alertsCount ?? 0 : 0;
  const canShowAlerts = canReadAlerts && alertsResolved && alertsCount > 0;

  const anomalyResolved = anomalyStatus === FETCH_STATUS.SUCCESS;
  const canShowAnomaly =
    canReadMlJobs && anomalyResolved && anomalyData?.anomalyScore !== undefined;

  return {
    alertsCount: canShowAlerts ? alertsCount : undefined,
    anomalyData: canShowAnomaly ? anomalyData : undefined,
  };
}
