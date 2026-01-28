/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import type { ApmSloClient } from '../../../lib/helpers/get_apm_slo_client';
import type { SloAlertsClient } from '../../../lib/helpers/get_slo_alerts_client';
import { APM_SLO_INDICATOR_TYPES } from '../../../../common/slo_indicator_types';
import { SERVICE_NAME, SERVICE_ENVIRONMENT } from '../../../../common/es_fields/apm';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

export interface StatusCounts {
  violated: number;
  degrading: number;
  healthy: number;
  noData: number;
}

export interface ServiceSlosResponse {
  results: SLOWithSummaryResponse[];
  total: number;
  page: number;
  perPage: number;
  activeAlerts: Record<string, number>;
  statusCounts: StatusCounts;
}

export async function getServiceSlos({
  sloClient,
  sloAlertsClient,
  serviceName,
  environment,
  statusFilters,
  kqlQuery,
  page,
  perPage,
}: {
  sloClient?: ApmSloClient;
  sloAlertsClient?: SloAlertsClient;
  serviceName: string;
  environment?: string;
  statusFilters?: string[];
  kqlQuery?: string;
  page: number;
  perPage: number;
}): Promise<ServiceSlosResponse> {
  const defaultStatusCounts: StatusCounts = {
    violated: 0,
    degrading: 0,
    healthy: 0,
    noData: 0,
  };

  if (!sloClient) {
    return {
      results: [],
      total: 0,
      page,
      perPage,
      activeAlerts: {},
      statusCounts: defaultStatusCounts,
    };
  }

  const filters: Array<Record<string, unknown>> = [
    { term: { [SERVICE_NAME]: serviceName } },
    {
      terms: {
        'slo.indicator.type': APM_SLO_INDICATOR_TYPES,
      },
    },
  ];

  if (environment && environment !== ENVIRONMENT_ALL.value) {
    filters.push({ term: { [SERVICE_ENVIRONMENT]: environment } });
  }

  if (statusFilters && statusFilters.length > 0) {
    filters.push({ terms: { status: statusFilters } });
  }

  const filtersQuery = JSON.stringify({
    must: [],
    filter: filters,
    should: [],
    must_not: [],
  });

  // Convert from 0-indexed (frontend) to 1-indexed (SLO API)
  const [sloResponse, groupedStatsResponse] = await Promise.all([
    sloClient.findSlos({
      filters: filtersQuery,
      kqlQuery: kqlQuery || undefined,
      page: String(page + 1),
      perPage: String(perPage),
      sortBy: 'status',
      sortDirection: 'desc',
    }),
    sloClient.getGroupedStats({
      type: 'apm',
      serviceNames: [serviceName],
      ...(environment && environment !== ENVIRONMENT_ALL.value && { environment }),
    }),
  ]);

  const serviceStats = groupedStatsResponse.results.find((result) => result.entity === serviceName);
  const statusCounts: StatusCounts = serviceStats?.summary ?? defaultStatusCounts;

  const slos = sloResponse.results;
  const activeAlertsMap: Record<string, number> = {};

  if (slos.length > 0 && sloAlertsClient) {
    const sloIdsAndInstanceIds = slos.map(
      (sloItem) => [sloItem.id, sloItem.instanceId ?? ALL_VALUE] as [string, string]
    );

    try {
      const alertsResult = await sloAlertsClient.alertsClient.find({
        size: 0,
        track_total_hits: false,
        _source: false,
        index: sloAlertsClient.sloAlertsIndices.join(','),
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: 'now-24h' } } },
              { term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } },
            ],
            should: sloIdsAndInstanceIds.map(([sloId, instanceId]) => ({
              bool: {
                filter: [
                  { term: { 'slo.id': sloId } },
                  ...(instanceId === ALL_VALUE ? [] : [{ term: { 'slo.instanceId': instanceId } }]),
                ],
              },
            })),
            minimum_should_match: 1,
          },
        },
        aggs: {
          perSloId: {
            multi_terms: {
              size: 10000,
              terms: [{ field: 'slo.id' }, { field: 'slo.instanceId' }],
            },
          },
        },
      });

      const buckets =
        (
          alertsResult.aggregations?.perSloId as
            | {
                buckets: Array<{
                  key: [string, string];
                  key_as_string: string;
                  doc_count: number;
                }>;
              }
            | undefined
        )?.buckets ?? [];

      for (const bucket of buckets) {
        activeAlertsMap[bucket.key_as_string] = bucket.doc_count;
      }
    } catch {
      // Silently fail on alerts fetch - SLOs are still useful without alert counts
    }
  }

  return {
    results: slos,
    total: sloResponse.total,
    // Convert from 1-indexed (SLO API) back to 0-indexed (frontend)
    page: sloResponse.page - 1,
    perPage: sloResponse.perPage,
    activeAlerts: activeAlertsMap,
    statusCounts,
  };
}
