/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { withApmSpan } from '../../../utils/with_apm_span';
import { MlClient } from '../../../lib/helpers/get_ml_client';
import { getHealthStatuses } from './get_health_statuses';
import { getServicesFromErrorAndMetricDocuments } from './get_services_from_error_and_metric_documents';
import { getServiceStats } from './get_service_stats';
import { getServiceStatsForServiceMetrics } from './get_service_stats_for_service_metric';
import { mergeServiceStats } from './merge_service_stats';
import { ServiceGroup } from '../../../../common/service_groups';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getServicesAlerts } from './get_service_alerts';
import { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';

export const MAX_NUMBER_OF_SERVICES = 1_000;

export async function getServicesItems({
  environment,
  kuery,
  mlClient,
  apmEventClient,
  apmAlertsClient,
  searchAggregatedTransactions,
  searchAggregatedServiceMetrics,
  logger,
  start,
  end,
  serviceGroup,
  randomSampler,
}: {
  environment: string;
  kuery: string;
  mlClient?: MlClient;
  apmEventClient: APMEventClient;
  apmAlertsClient: ApmAlertsClient;
  searchAggregatedTransactions: boolean;
  searchAggregatedServiceMetrics: boolean;
  logger: Logger;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
}) {
  return withApmSpan('get_services_items', async () => {
    const commonParams = {
      environment,
      kuery,
      searchAggregatedTransactions,
      searchAggregatedServiceMetrics,
      maxNumServices: MAX_NUMBER_OF_SERVICES,
      start,
      end,
      serviceGroup,
      randomSampler,
    };

    const [
      transactionStats,
      { services, maxServiceCountExceeded },
      healthStatuses,
      alertCounts,
    ] = await Promise.all([
      searchAggregatedServiceMetrics
        ? getServiceStatsForServiceMetrics({
            ...commonParams,
            apmEventClient,
          })
        : getServiceStats({
            ...commonParams,
            apmEventClient,
          }),
      getServicesFromErrorAndMetricDocuments({
        ...commonParams,
        apmEventClient,
      }),
      getHealthStatuses({ ...commonParams, mlClient }).catch((err) => {
        logger.error(err);
        return [];
      }),
      getServicesAlerts({ ...commonParams, apmAlertsClient }).catch((err) => {
        logger.error(err);
        return [];
      }),
    ]);

    return {
      items:
        mergeServiceStats({
          transactionStats,
          servicesFromErrorAndMetricDocuments: services,
          healthStatuses,
          alertCounts,
        }) ?? [],
      maxServiceCountExceeded,
    };
  });
}
