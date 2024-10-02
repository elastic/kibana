/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { Logger } from '@kbn/core/server';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { RollupInterval } from '../../../../common/rollup';
import { ApmDocumentType } from '../../../../common/document_type';
import { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { MlClient } from '../../../lib/helpers/get_ml_client';
import { getServicesItems } from '../../services/get_services/get_services_items';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';

export interface ApmServicesListItem {
  'service.name': string;
  'agent.name'?: string;
  'transaction.type'?: string;
  alertsCount: number;
  healthStatus: ServiceHealthStatus;
  'service.environment'?: string[];
}

export async function getApmServiceList({
  arguments: args,
  apmEventClient,
  mlClient,
  apmAlertsClient,
  logger,
  randomSampler,
}: {
  arguments: {
    serviceEnvironment?: string | undefined;
    healthStatus?: ServiceHealthStatus[] | undefined;
    start: string;
    end: string;
  };
  apmEventClient: APMEventClient;
  mlClient?: MlClient;
  apmAlertsClient: ApmAlertsClient;
  logger: Logger;
  randomSampler: RandomSampler;
}): Promise<ApmServicesListItem[]> {
  const { healthStatus } = args;

  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const serviceItems = await getServicesItems({
    apmAlertsClient,
    apmEventClient,
    documentType: ApmDocumentType.TransactionMetric,
    start,
    end,
    environment: args.serviceEnvironment || ENVIRONMENT_ALL.value,
    kuery: '',
    logger,
    randomSampler,
    rollupInterval: RollupInterval.OneMinute,
    serviceGroup: null,
    mlClient,
    useDurationSummary: false,
  });

  let mappedItems = serviceItems.items.map((item) => {
    return {
      'service.name': item.serviceName,
      'agent.name': item.agentName,
      alertsCount: item.alertsCount ?? 0,
      healthStatus: item.healthStatus ?? ServiceHealthStatus.unknown,
      'service.environment': item.environments,
      'transaction.type': item.transactionType,
    };
  });

  if (healthStatus && healthStatus.length) {
    mappedItems = mappedItems.filter((item): boolean => healthStatus.includes(item.healthStatus));
  }

  return mappedItems;
}
