/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { withApmSpan } from '../../../utils/with_apm_span';
import { MlClient } from '../../../lib/helpers/get_ml_setup';
import { getHealthStatuses } from './get_health_statuses';
import { getServicesFromErrorAndMetricDocuments } from './get_services_from_error_and_metric_documents';
import { getServiceTransactionStats } from './get_service_transaction_stats';
import { getServiceAggregatedTransactionStats } from './get_service_aggregated_transaction_stats';
import { mergeServiceStats } from './merge_service_stats';
import { ServiceGroup } from '../../../../common/service_groups';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

const MAX_NUMBER_OF_SERVICES = 500;

export async function getServicesItems({
  environment,
  kuery,
  mlSetup,
  apmEventClient,
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
  mlSetup?: MlClient;
  apmEventClient: APMEventClient;
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
      servicesFromErrorAndMetricDocuments,
      healthStatuses,
    ] = await Promise.all([
      searchAggregatedServiceMetrics
        ? getServiceAggregatedTransactionStats({
            ...commonParams,
            apmEventClient,
          })
        : getServiceTransactionStats({
            ...commonParams,
            apmEventClient,
          }),
      getServicesFromErrorAndMetricDocuments({
        ...commonParams,
        apmEventClient,
      }),
      getHealthStatuses({ ...commonParams, mlSetup }).catch((err) => {
        logger.error(err);
        return [];
      }),
    ]);

    return mergeServiceStats({
      transactionStats,
      servicesFromErrorAndMetricDocuments,
      healthStatuses,
    });
  });
}
