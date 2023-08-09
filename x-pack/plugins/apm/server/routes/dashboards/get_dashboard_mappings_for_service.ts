/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  DashboardMappingTypeEnum,
  SavedServiceDashboardMapping,
} from '../../../common/service_dashboards';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getDashboardMappingsForService({
  apmEventClient,
  dashboardMappings,
  serviceName,
}: {
  apmEventClient: APMEventClient;
  dashboardMappings: SavedServiceDashboardMapping[];
  serviceName: string;
}) {
  if (!dashboardMappings.length) {
    return [];
  }
  const dashboadMappingsMap: Record<string, QueryDslQueryContainer> =
    dashboardMappings
      .filter((dm) => dm.type === DashboardMappingTypeEnum.multi && !!dm.kuery)
      .reduce((acc, dm) => {
        return {
          ...acc,
          [dm.id]: kqlQuery(dm.kuery)[0],
        };
      }, {});

  if (
    !Object.keys(dashboadMappingsMap).length ||
    Object.keys(dashboadMappingsMap).length === 0
  ) {
    return [];
  }

  const params = {
    apm: {
      events: [ProcessorEvent.metric, ProcessorEvent.transaction],
    },
    body: {
      track_total_hits: 0,
      size: 0,
      query: {
        bool: {
          filter: [{ term: { [SERVICE_NAME]: serviceName } }],
        },
      },
      aggs: {
        dashboard_mappings: {
          filters: {
            filters: dashboadMappingsMap,
          },
          aggs: {
            services_count: {
              cardinality: {
                field: SERVICE_NAME,
              },
            },
          },
        },
      },
    },
  };
  const response = await apmEventClient.search(
    'get_dashboard_mappings_for_service',
    params
  );

  const buckets: Record<string, { services_count: { value: number } }> =
    response?.aggregations?.dashboard_mappings.buckets ?? {};

  const applicableDashboardMappingIds = Object.keys(buckets).filter(
    (key) => buckets[key].services_count.value > 0
  );

  return dashboardMappings.filter((mapping) =>
    applicableDashboardMappingIds.includes(mapping.id)
  );
}
