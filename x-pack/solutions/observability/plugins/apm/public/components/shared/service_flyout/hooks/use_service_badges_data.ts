/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAnomalyScoreResponse } from '@kbn/apm-api-shared';
import type { SloStatus } from '@kbn/apm-types';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { Environment } from '../../../../../common/environment_rt';
import { useServiceFlyoutContext } from '../service_flyout_context';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';

function getWorstSloStatus(
  total: number,
  statusCounts: Partial<Record<SloStatus, number>> | undefined
): { sloStatus: SloStatus | 'noSLOs'; sloCount: number } {
  if (total === 0 || !statusCounts) return { sloStatus: 'noSLOs', sloCount: 0 };
  for (const priority of ['violated', 'degrading', 'noData', 'healthy'] as SloStatus[]) {
    const count = statusCounts[priority] ?? 0;
    if (count > 0) return { sloStatus: priority, sloCount: count };
  }
  return { sloStatus: 'noSLOs', sloCount: 0 };
}

interface ServiceBadgesDataParams {
  serviceName: string;
  environment: Environment;
  rangeFrom: string;
  rangeTo: string;
}

interface ServiceBadgesData {
  alertsCount?: number;
  anomalyData?: ServiceAnomalyScoreResponse;
  sloData?: { sloStatus: SloStatus | 'noSLOs'; sloCount: number };
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
  const canReadSlos = !!capabilities.slo?.read;

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

  const { data: slosData, status: slosStatus } = useFetcher(
    (callApmApi) => {
      if (!canReadSlos) return;
      return callApmApi('GET /internal/apm/services/{serviceName}/slos', {
        params: {
          path: { serviceName },
          query: { environment, page: 0, perPage: 1 },
        },
      }).catch(() => undefined);
    },
    [serviceName, environment, canReadSlos],
    { showToastOnError: false }
  );

  const alertsResolved = alertsStatus === FETCH_STATUS.SUCCESS;
  const alertsCount = alertsResolved ? alertsData?.alertsCount ?? 0 : 0;
  const canShowAlerts = canReadAlerts && alertsResolved && alertsCount > 0;

  const anomalyResolved = anomalyStatus === FETCH_STATUS.SUCCESS;
  const canShowAnomaly =
    canReadMlJobs && anomalyResolved && anomalyData?.anomalyScore !== undefined;

  const slosResolved = slosStatus === FETCH_STATUS.SUCCESS;
  const canShowSlo = canReadSlos && slosResolved;

  return {
    alertsCount: canShowAlerts ? alertsCount : undefined,
    anomalyData: canShowAnomaly ? anomalyData : undefined,
    sloData: canShowSlo
      ? getWorstSloStatus(slosData?.total ?? 0, slosData?.statusCounts)
      : undefined,
  };
}
