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
import { StreamEntitiesManagerServer } from '../types';
import { ApiScraperTask } from '../lib/api/tasks/api_scraper_task';

export interface RouteDependencies {
  server: StreamEntitiesManagerServer;
  getScopedClients: ({ request }: { request: KibanaRequest }) => Promise<{
    scopedClusterClient: IScopedClusterClient;
    soClient: SavedObjectsClientContract;
  }>;
  tasks: {
    apiScraperTask: ApiScraperTask;
  };
}

export type StreamEntitiesManagerRouteHandlerResources = RouteDependencies &
  DefaultRouteHandlerResources;
