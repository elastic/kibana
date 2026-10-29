/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { termQuery, rangeQuery, wildcardQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_RULE_TYPE_ID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  SLO_BURN_RATE_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { ALL_VALUE } from '@kbn/slo-constants';
import type { ServiceAlertsResponse } from '@kbn/apm-api-shared';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import type { ServiceGroup } from '../../../../common/service_groups';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getAlertsBadgeEndMs } from '../../../utils/get_alerts_badge_end';
import { MAX_NUMBER_OF_SERVICES } from './get_services_items';
import { serviceGroupWithOverflowQuery } from '../../../lib/service_group_query_with_overflow';

export async function getServicesAlerts({
  apmAlertsClient,
  maxNumServices = MAX_NUMBER_OF_SERVICES,
  serviceGroup,
  serviceName,
  serviceNames,
  start,
  end,
  environment,
  searchQuery,
}: {
  apmAlertsClient: ApmAlertsClient;
  maxNumServices?: number;
  serviceGroup?: ServiceGroup | null;
  serviceName?: string;
  /** When set, restricts results to these service names (e.g. service map nodes). */
  serviceNames?: string[];
  start: number;
  end: number;
  environment?: string;
  searchQuery?: string;
}): Promise<ServiceAlertsResponse> {
  if (serviceNames && serviceNames.length === 0) {
    return [];
  }

  const termsAggregationSize =
    serviceNames && serviceNames.length > 0
      ? Math.min(serviceNames.length, maxNumServices)
      : maxNumServices;

  // Badge counts mean currently active alerts: extend a past picker end to now so
  // inventory, alerts_count, and service-map badges share the same window.
  // Use alert lifetime (kibana.alert.time_range), not @timestamp write time.
  // Kuery is intentionally omitted — badges are entity health (service/env), not search-bar scoped.
  const badgesEnd = getAlertsBadgeEndMs(end);

  const params = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
          ...rangeQuery(start, badgesEnd, ALERT_TIME_RANGE),
          ...serviceGroupWithOverflowQuery(serviceGroup),
          // Either a bounded list (e.g. service map) or a single service — not both. When
          // neither is set, we aggregate across services (up to maxNumServices). `termQuery`
          // is a no-op when `serviceName` is undefined.
          ...(serviceNames && serviceNames.length > 0
            ? [{ terms: { [SERVICE_NAME]: serviceNames } }]
            : termQuery(SERVICE_NAME, serviceName)),
          ...wildcardQuery(SERVICE_NAME, searchQuery),
          ...alertsEnvironmentQuery(environment),
        ],
      },
    },
    aggs: {
      services: {
        terms: {
          field: SERVICE_NAME,
          size: termsAggregationSize,
        },
        aggs: {
          alerts_count: {
            cardinality: {
              field: ALERT_UUID,
            },
          },
        },
      },
    },
  };

  const result = await apmAlertsClient.search(params);

  const filterAggBuckets = result.aggregations?.services.buckets ?? [];

  const servicesAlertsCount: Array<{
    serviceName: string;
    alertsCount: number;
  }> = filterAggBuckets.map((bucket) => ({
    serviceName: bucket.key as string,
    alertsCount: bucket.alerts_count.value,
  }));

  return servicesAlertsCount;
}

/**
 * Extends the standard environmentQuery to also include SLO burn rate alerts
 * from SLOs created with the wildcard (*) environment. Those alerts have
 * service.environment set to '*' (temp summary) or missing (real summary).
 */
function alertsEnvironmentQuery(environment?: string): QueryDslQueryContainer[] {
  if (!environment || environment === ENVIRONMENT_ALL.value) {
    return environmentQuery(environment);
  }

  return [
    {
      bool: {
        should: [
          ...environmentQuery(environment),
          {
            bool: {
              filter: [{ term: { [ALERT_RULE_TYPE_ID]: SLO_BURN_RATE_RULE_TYPE_ID } }],
              should: [
                { term: { [SERVICE_ENVIRONMENT]: ALL_VALUE } },
                { bool: { must_not: { exists: { field: SERVICE_ENVIRONMENT } } } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
  ];
}
