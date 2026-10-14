/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import type {
  APMEventClient,
  APMEventESSearchRequest,
} from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { SavedApmCustomDashboard } from '../../../common/custom_dashboards';

function getSearchRequest(filters: estypes.QueryDslQueryContainer[]): APMEventESSearchRequest {
  return {
    apm: {
      events: [ProcessorEvent.metric, ProcessorEvent.transaction],
    },
    track_total_hits: false,
    terminate_after: 1,
    size: 1,
    query: {
      bool: {
        filter: filters,
      },
    },
  };
}
export async function getServicesWithDashboards({
  apmEventClient,
  allLinkedCustomDashboards,
  serviceName,
  start,
  end,
  logger,
}: {
  apmEventClient: APMEventClient;
  allLinkedCustomDashboards: SavedApmCustomDashboard[];
  serviceName: string;
  start: number;
  end: number;
  logger: Logger;
}): Promise<SavedApmCustomDashboard[]> {
  // A single unparseable stored kuery must not fail the whole request, otherwise one broken link
  // hides the linked dashboards of every service. See https://github.com/elastic/kibana/issues/245023
  const searchesPerDashboard = allLinkedCustomDashboards.flatMap((dashboard) => {
    try {
      return [
        {
          dashboard,
          search: getSearchRequest([
            ...kqlQuery(dashboard.kuery),
            ...termQuery(SERVICE_NAME, serviceName),
            ...rangeQuery(start, end),
          ]),
        },
      ];
    } catch {
      logger.warn(
        `Skipping APM custom dashboard "${dashboard.id}": stored filter is not a valid KQL expression ("${dashboard.kuery}"). Re-link the dashboard to repair it.`
      );
      return [];
    }
  });

  if (searchesPerDashboard.length === 0) {
    return [];
  }

  const allResponses = (
    await apmEventClient.msearch(
      'get_services_with_dashboards',
      ...searchesPerDashboard.map(({ search }) => search)
    )
  ).responses;

  return searchesPerDashboard
    .filter((_, index) => allResponses[index].hits.hits.length > 0)
    .map(({ dashboard }) => dashboard);
}
