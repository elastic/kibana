/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { estypes } from '@elastic/elasticsearch';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { SavedApmCustomDashboard } from '../../../common/custom_dashboards';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';

function getSearchRequest(filters: estypes.QueryDslQueryContainer[]) {
  return {
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
export async function getEntitiesWithDashboards({
  entitiesESClient,
  allLinkedCustomDashboards,
  serviceName,
}: {
  entitiesESClient: EntitiesESClient;
  allLinkedCustomDashboards: SavedApmCustomDashboard[];
  serviceName: string;
}): Promise<SavedApmCustomDashboard[]> {
  const allKueryPerDashboard = allLinkedCustomDashboards.map(({ kuery }) => ({
    kuery,
  }));

  const allSearches = allKueryPerDashboard.map((dashboard) =>
    getSearchRequest([...kqlQuery(dashboard.kuery), ...termQuery(SERVICE_NAME, serviceName)])
  );

  const filteredDashboards = [];

  if (allSearches.length > 0) {
    const allResponses = (await entitiesESClient.msearch(allSearches)).responses;

    for (let index = 0; index < allLinkedCustomDashboards.length; index++) {
      const responsePerDashboard = allResponses[index];
      const dashboard = allLinkedCustomDashboards[index];

      if (responsePerDashboard.hits.hits.length > 0) {
        filteredDashboards.push(dashboard);
      }
    }
  }

  return filteredDashboards;
}
