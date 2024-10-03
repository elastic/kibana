/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { EntityClient } from '../lib/entity_client';
import { EntityManagerServer } from '../types';
import { EntityMergeTask } from '../lib/entities/tasks/entity_merge_task';
import { EntityElasticsearchApiTask } from '../lib/entities/tasks/entity_elasticsearch_api_task';

export interface EntityManagerRouteDependencies {
  server: EntityManagerServer;
  getScopedEntityClient: ({ request }: { request: KibanaRequest }) => Promise<EntityClient>;
  getScopedClients: ({ request }: { request: KibanaRequest }) => Promise<{
    scopedClusterClient: IScopedClusterClient;
    soClient: SavedObjectsClientContract;
  }>;
  tasks: {
    entityMergeTask: EntityMergeTask;
    entityElasticsearchApiTask: EntityElasticsearchApiTask;
  };
}

export type EntityManagerRouteHandlerResources = EntityManagerRouteDependencies &
  DefaultRouteHandlerResources;
