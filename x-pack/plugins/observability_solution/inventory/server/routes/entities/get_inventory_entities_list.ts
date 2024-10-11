/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { type EntityType } from '../../../common/entities';

export async function getInventoryEntitiesList({
  inventoryEsClient,
  sortDirection,
  sortField,
  entityTypes,
  kuery,
  alertsClient,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  sortDirection: 'asc' | 'desc';
  sortField: string;
  entityTypes?: EntityType[];
  kuery?: string;
  alertsClient: AlertsClient;
}) {}
