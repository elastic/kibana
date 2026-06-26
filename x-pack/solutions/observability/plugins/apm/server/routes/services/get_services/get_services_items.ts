/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { kqlQuery, rangeQuery, wildcardQuery } from '@kbn/observability-plugin/server';
import {
  ApmDocumentType,
  type ApmServiceTransactionDocumentType,
} from '../../../../common/document_type';
import type { RollupInterval } from '../../../../common/rollup';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import type { ServiceGroup } from '../../../../common/service_groups';
import { environmentQuery } from '../../../../common/utils/environment_query';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import type { ApmSloClient } from '../../../lib/helpers/get_apm_slo_client';
import type { MlClient } from '../../../lib/helpers/get_ml_client';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { serviceGroupWithOverflowQuery } from '../../../lib/service_group_query_with_overflow';
import { withRollupFallback } from '../../../lib/rollup_fallback';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getServiceAnomalyScores } from './get_service_anomaly_scores';
import { getServicesAlerts } from './get_service_alerts';
import { getServicesSloStats } from './get_services_slo_stats';
import { getServiceTransactionStats } from './get_service_transaction_stats';
import type { MergedServiceStat } from './merge_service_stats';
import { mergeServiceStats } from './merge_service_stats';

export const MAX_NUMBER_OF_SERVICES = 1_000;

export interface ServicesItemsResponse {
  items: MergedServiceStat[];
  maxCountExceeded: boolean;
  serviceOverflowCount: number;
  /**
   * Set when the requested rollup interval was missing services and a finer rollup interval was
   * queried instead, so the UI can let the user know the list was recovered from a more granular
   * (and potentially slower) source.
   */
  fellBackToRollupInterval?: RollupInterval;
}

export async function getServicesItems({
  environment,
  kuery,
  mlClient,
  apmEventClient,
  apmAlertsClient,
  sloClient,
  logger,
  start,
  end,
  serviceGroup,
  randomSampler,
  documentType,
  rollupInterval,
  useDurationSummary,
  searchQuery,
  enableRollupFallback = false,
}: {
  environment: string;
  kuery: string;
  mlClient?: MlClient;
  apmEventClient: APMEventClient;
  apmAlertsClient: ApmAlertsClient;
  sloClient?: ApmSloClient;
  logger: Logger;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
  documentType: ApmServiceTransactionDocumentType;
  rollupInterval: RollupInterval;
  useDurationSummary: boolean;
  searchQuery?: string;
  enableRollupFallback?: boolean;
}): Promise<ServicesItemsResponse> {
  return withApmSpan('get_services_items', async () => {
    // Cheap probe: count the distinct services visible at a given rollup interval for the same
    // filters/time range. Used to detect when a coarse rollup is missing services that a finer tier
    // can still see, without paying for a full re-query unless there is a real gap.
    async function countServices(currentRollupInterval: RollupInterval) {
      const response = await apmEventClient.search('get_services_items_count', {
        apm: {
          sources: [{ documentType, rollupInterval: currentRollupInterval }],
        },
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              ...serviceGroupWithOverflowQuery(serviceGroup),
              ...wildcardQuery(SERVICE_NAME, searchQuery),
            ],
          },
        },
        aggs: {
          service_count: { cardinality: { field: SERVICE_NAME } },
        },
      });

      return response.aggregations?.service_count.value ?? 0;
    }

    async function getItemsForRollupInterval(currentRollupInterval: RollupInterval) {
      const commonParams = {
        environment,
        kuery,
        maxNumServices: MAX_NUMBER_OF_SERVICES,
        start,
        end,
        serviceGroup,
        randomSampler,
        documentType,
        rollupInterval: currentRollupInterval,
        useDurationSummary,
        searchQuery,
      };

      const [{ serviceStats, serviceOverflowCount, maxCountExceeded }, anomalyScores, alertCounts] =
        await Promise.all([
          getServiceTransactionStats({
            ...commonParams,
            apmEventClient,
          }),
          getServiceAnomalyScores({ ...commonParams, mlClient }).catch((err) => {
            logger.debug(err);
            return [];
          }),
          getServicesAlerts({ ...commonParams, apmAlertsClient }).catch((err) => {
            logger.debug(err);
            return [];
          }),
        ]);

      const sloStats = await getServicesSloStats({
        ...commonParams,
        serviceNames: serviceStats.map(({ serviceName }) => serviceName),
        sloClient,
      }).catch((err) => {
        logger.debug(err);
        return [];
      });

      const items =
        mergeServiceStats({
          serviceStats,
          anomalyScores,
          alertCounts,
          sloStats,
        }) ?? [];

      return {
        items,
        maxCountExceeded,
        serviceOverflowCount,
      };
    }

    // Only rolled-up service metrics have a finer tier to fall back to; raw transaction events do
    // not.
    const isRolledUpMetric =
      documentType === ApmDocumentType.ServiceTransactionMetric ||
      documentType === ApmDocumentType.TransactionMetric;

    const { result, fellBackToRollupInterval } = await withRollupFallback({
      enableRollupFallback,
      isRolledUpMetric,
      rollupInterval,
      countEntities: countServices,
      queryRollupInterval: getItemsForRollupInterval,
    });

    return {
      items: result.items,
      maxCountExceeded: result.maxCountExceeded,
      serviceOverflowCount: result.serviceOverflowCount,
      fellBackToRollupInterval,
    };
  });
}
