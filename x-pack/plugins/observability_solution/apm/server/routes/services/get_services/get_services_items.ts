/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { ServiceGroup } from '../../../../common/service_groups';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { MlClient } from '../../../lib/helpers/get_ml_client';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getHealthStatuses } from './get_health_statuses';
import { getServicesWithoutTransactions } from './get_services_without_transactions';
import { getServicesAlerts } from './get_service_alerts';
import { getServiceTransactionStats } from './get_service_transaction_stats';
import { MergedServiceStat, mergeServiceStats } from './merge_service_stats';

export const MAX_NUMBER_OF_SERVICES = 1_000;

export interface ServicesItemsResponse {
  items: MergedServiceStat[];
  maxCountExceeded: boolean;
  serviceOverflowCount: number;
}

export async function getServicesItems({
  environment,
  kuery,
  mlClient,
  apmEventClient,
  apmAlertsClient,
  logger,
  start,
  end,
  serviceGroup,
  randomSampler,
  documentType,
  rollupInterval,
  useDurationSummary,
  searchQuery,
}: {
  environment: string;
  kuery: string;
  mlClient?: MlClient;
  apmEventClient: APMEventClient;
  apmAlertsClient: ApmAlertsClient;
  logger: Logger;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
  documentType: ApmServiceTransactionDocumentType;
  rollupInterval: RollupInterval;
  useDurationSummary: boolean;
  searchQuery?: string;
}): Promise<ServicesItemsResponse> {
  return withApmSpan('get_services_items', async () => {
    const commonParams = {
      environment,
      kuery,
      maxNumServices: MAX_NUMBER_OF_SERVICES,
      start,
      end,
      serviceGroup,
      randomSampler,
      documentType,
      rollupInterval,
      useDurationSummary,
      searchQuery,
    };

    const [
      { serviceStats, serviceOverflowCount },
      { services: servicesWithoutTransactions, maxCountExceeded },
      healthStatuses,
      alertCounts,
    ] = await Promise.all([
      getServiceTransactionStats({
        ...commonParams,
        apmEventClient,
      }),
      getServicesWithoutTransactions({
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
          serviceStats,
          servicesWithoutTransactions,
          healthStatuses,
          alertCounts,
        }) ?? [],
      maxCountExceeded,
      serviceOverflowCount,
    };
  });
}
