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
import { StreamsServer } from '../types';

export interface RouteDependencies {
  server: StreamsServer;
  getScopedClients: ({ request }: { request: KibanaRequest }) => Promise<{
    scopedClusterClient: IScopedClusterClient;
    soClient: SavedObjectsClientContract;
  }>;
}

export type StreamsRouteHandlerResources = RouteDependencies & DefaultRouteHandlerResources;
