/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { estypes } from '@elastic/elasticsearch';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import {
  APMEventClient,
  APMEventESSearchRequest,
} from '../../lib/helpers/create_es_client/create_apm_event_client';
import { SavedServiceDashboard } from '../../../common/service_dashboards';

function getSearchRequest(
  filters: estypes.QueryDslQueryContainer[]
): APMEventESSearchRequest {
  return {
    apm: {
      events: [ProcessorEvent.metric, ProcessorEvent.transaction],
    },
    body: {
      track_total_hits: false,
      terminate_after: 1,
      size: 1,
      query: {
        bool: {
          filter: filters,
        },
      },
    },
  };
}
export async function getServicesWithDashboards({
  apmEventClient,
  allLinkedCustomDashboards,
  serviceName,
}: {
  apmEventClient: APMEventClient;
  allLinkedCustomDashboards: SavedServiceDashboard[];
  serviceName: string;
}): Promise<SavedServiceDashboard[]> {
  const allKueryPerDashboard = allLinkedCustomDashboards.map(({ kuery }) => ({
    kuery,
  }));
  const allSearches = allKueryPerDashboard.map((dashboard) =>
    getSearchRequest([
      ...kqlQuery(dashboard.kuery),
      ...termQuery(SERVICE_NAME, serviceName),
    ])
  );

  const allResponses = (
    await apmEventClient.msearch('get_services_with_dashboards', ...allSearches)
  ).responses;

  const filteredDashboards = [];

  for (let index = 0; index < allLinkedCustomDashboards.length; index++) {
    const responsePerDashboard = allResponses[index];
    const dashboard = allLinkedCustomDashboards[index];

    if (responsePerDashboard.hits.hits.length > 0) {
      filteredDashboards.push(dashboard);
    }
  }

  return filteredDashboards;
}
