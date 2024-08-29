/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { EntityManagerServerSetup } from '../types';

export interface EntityManagerRouteDependencies {
  server: EntityManagerServerSetup;
}

export type EntityManagerRouteHandlerResources = EntityManagerRouteDependencies &
  DefaultRouteHandlerResources;
