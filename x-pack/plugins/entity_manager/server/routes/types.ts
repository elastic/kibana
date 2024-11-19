/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { EntityClient } from '../lib/entity_client';
import { EntityManagerServerSetup } from '../types';

export interface EntityManagerRouteDependencies {
  server: EntityManagerServerSetup;
  getScopedClient: ({ request }: { request: KibanaRequest }) => Promise<EntityClient>;
}

export type EntityManagerRouteHandlerResources = EntityManagerRouteDependencies &
  DefaultRouteHandlerResources;
