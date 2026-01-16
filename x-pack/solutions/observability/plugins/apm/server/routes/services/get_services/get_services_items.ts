/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import type { RollupInterval } from '../../../../common/rollup';
import type { ServiceGroup } from '../../../../common/service_groups';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import type { MlClient } from '../../../lib/helpers/get_ml_client';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getHealthStatuses } from './get_health_statuses';
import { getServicesAlerts } from './get_service_alerts';
import { getServicesSlos } from './get_service_slos';
import { getServiceTransactionStats } from './get_service_transaction_stats';
import { ServiceInventoryFieldName } from '../../../../common/service_inventory';
import type { MergedServiceStat } from './merge_service_stats';
import { mergeServiceStats } from './merge_service_stats';

export const MAX_NUMBER_OF_SERVICES = 1_000;

export interface ServicesItemsResponse {
  items: MergedServiceStat[];
  maxCountExceeded: boolean;
  serviceOverflowCount: number;
  // The highest priority sort field based on available data
  // Priority: alertsCount -> sloStatus -> healthStatus -> throughput
  sortField: ServiceInventoryFieldName;
}

export async function getServicesItems({
  environment,
  kuery,
  mlClient,
  apmEventClient,
  apmAlertsClient,
  esClient,
  spaceId,
  logger,
  start,
  end,
  serviceGroup,
  randomSampler,
  documentType,
  rollupInterval,
  useDurationSummary,
  searchQuery,
  includeSloStatus = true,
}: {
  environment: string;
  kuery: string;
  mlClient?: MlClient;
  apmEventClient: APMEventClient;
  apmAlertsClient: ApmAlertsClient;
  esClient?: ElasticsearchClient;
  spaceId?: string;
  logger: Logger;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
  documentType: ApmServiceTransactionDocumentType;
  rollupInterval: RollupInterval;
  useDurationSummary: boolean;
  searchQuery?: string;
  includeSloStatus?: boolean;
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

    // First, fetch the main service stats, health statuses, and alerts in parallel
    const [{ serviceStats, serviceOverflowCount, maxCountExceeded }, healthStatuses, alertCounts] =
      await Promise.all([
        getServiceTransactionStats({
          ...commonParams,
          apmEventClient,
        }),
        getHealthStatuses({ ...commonParams, mlClient }).catch((err) => {
          logger.debug(err);
          return [];
        }),
        getServicesAlerts({ ...commonParams, apmAlertsClient }).catch((err) => {
          logger.debug(err);
          return [];
        }),
      ]);

    const serviceNames = serviceStats.map((s) => s.serviceName);
    const shouldFetchSlos = includeSloStatus && esClient && spaceId && serviceNames.length > 0;

    const sloCounts = shouldFetchSlos
      ? await getServicesSlos({
          esClient,
          spaceId,
          environment,
          serviceNames,
        }).catch((err) => {
          logger.debug(err);
          return [];
        })
      : [];

    const items =
      mergeServiceStats({
        serviceStats,
        healthStatuses,
        alertCounts,
        sloCounts,
      }) ?? [];

    // Determine the highest priority sort field based on available data
    // Priority: alertsCount -> sloStatus -> healthStatus -> throughput
    const hasAlerts = alertCounts.length > 0;
    const hasSlos = sloCounts.length > 0;
    const hasHealthStatuses = healthStatuses.length > 0;

    let sortField: ServiceInventoryFieldName;
    if (hasAlerts) {
      sortField = ServiceInventoryFieldName.AlertsCount;
    } else if (hasSlos) {
      sortField = ServiceInventoryFieldName.SloStatus;
    } else if (hasHealthStatuses) {
      sortField = ServiceInventoryFieldName.HealthStatus;
    } else {
      sortField = ServiceInventoryFieldName.Throughput;
    }

    return {
      items,
      maxCountExceeded,
      serviceOverflowCount,
      sortField,
    };
  });
}
