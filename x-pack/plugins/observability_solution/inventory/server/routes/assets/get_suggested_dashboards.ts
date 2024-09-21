/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import {
  DashboardWithEntityDataCheck,
  checkDashboardsForEntityData,
} from '../entities/check_dashboards_for_entity_data';
import type { Entity, IdentityField } from '../../../common/entities';

export async function getSuggestedDashboards({
  esClient,
  savedObjectsClient,
  logger,
  entity,
  identityFields,
  start,
  end,
}: {
  esClient: ObservabilityElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  entity: Entity;
  identityFields: IdentityField[];
  start: number;
  end: number;
}): Promise<DashboardWithEntityDataCheck[]> {
  async function getDashboards(
    page: number
  ): Promise<Array<SavedObjectsFindResult<DashboardAttributes>>> {
    const perPage = 1000;

    const response = await savedObjectsClient.find<DashboardAttributes>({
      type: 'dashboard',
      perPage,
      page,
    });

    const fetchedUntil = (page - 1) * perPage + response.saved_objects.length;

    if (response.total <= fetchedUntil) {
      return response.saved_objects;
    }
    return [...response.saved_objects, ...(await getDashboards(page + 1))];
  }

  const allDashboards = await getDashboards(1);

  return await checkDashboardsForEntityData({
    esClient,
    logger,
    dashboards: allDashboards,
    start,
    end,
    entity,
    identityFields,
  });
}
