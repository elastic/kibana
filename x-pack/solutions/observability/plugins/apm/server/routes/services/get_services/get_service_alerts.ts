/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE, ALERT_UUID } from '@kbn/rule-data-utils';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import type { ServiceGroup } from '../../../../common/service_groups';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { MAX_NUMBER_OF_SERVICES } from './get_services_items';
import { serviceGroupWithOverflowQuery } from '../../../lib/service_group_query_with_overflow';

export type ServiceAlertsResponse = Array<{
  serviceName: string;
  alertsCount: number;
}>;

export async function getServicesAlerts({
  apmAlertsClient,
  kuery,
  maxNumServices = MAX_NUMBER_OF_SERVICES,
  serviceGroup,
  serviceName,
  start,
  end,
  environment,
  searchQuery,
}: {
  apmAlertsClient: ApmAlertsClient;
  kuery?: string;
  maxNumServices?: number;
  serviceGroup?: ServiceGroup | null;
  serviceName?: string;
  start: number;
  end: number;
  environment?: string;
  searchQuery?: string;
}): Promise<ServiceAlertsResponse> {
  const params = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
          ...rangeQuery(start, end),
          ...kqlQuery(kuery),
          ...serviceGroupWithOverflowQuery(serviceGroup),
          // ...wildcardQuery(SERVICE_NAME, searchQuery),
          ...environmentQuery(environment),
        ],
        ...(serviceName
          ? {
              should: [
                ...termQuery(SERVICE_NAME, serviceName),
                ...termQuery('tags', `service.name:${serviceName}`),
              ],
              minimum_should_match: 1,
            }
          : {}),
      },
    },
    aggs: {
      services: {
        terms: {
          field: SERVICE_NAME,
          size: maxNumServices,
        },
        aggs: {
          alerts_count: {
            cardinality: {
              field: ALERT_UUID,
            },
          },
        },
      },
      services_from_tags: {
        terms: {
          field: 'tags',
          include: 'service.name:.*|service:.*',
          size: maxNumServices,
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

  const servicesBuckets = result.aggregations?.services.buckets ?? [];
  const tagsBuckets = result.aggregations?.services_from_tags.buckets ?? [];

  // Map service names from SERVICE_NAME field
  const servicesMap = new Map<string, number>();
  servicesBuckets.forEach((bucket) => {
    const name = bucket.key as string;
    const count = (bucket.alerts_count as { value: number }).value;
    servicesMap.set(name, count);
  });

  // Extract service names from tags with service.name: or service: prefix
  tagsBuckets.forEach((bucket) => {
    const tag = String(bucket.key);
    const [key, ...valueParts] = tag.split(':');
    const value = valueParts.join(':'); // Rejoin in case service name contains colons

    if ((key === 'service.name' || key === 'service') && value) {
      const count = (bucket.alerts_count as { value: number }).value;
      const existingCount = servicesMap.get(value) ?? 0;
      // Take the maximum since the same alert might appear in both aggregations
      servicesMap.set(value, Math.max(existingCount, count));
    }
  });

  // Convert map to array and sort by service name
  const servicesAlertsCount: Array<{
    serviceName: string;
    alertsCount: number;
  }> = Array.from(servicesMap.entries())
    .map(([name, count]) => ({
      serviceName: name,
      alertsCount: count,
    }))
    .slice(0, maxNumServices);

  return servicesAlertsCount;
}
