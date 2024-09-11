/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';

import { registerGetAllRoute } from './register_get_route';
import { registerCreateRoute } from './register_create_route';
import { registerUpdateRoute } from './register_update_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerPrivilegesRoute } from './register_privileges_route';
import {
  registerGetDatastreams,
  registerReferencedIndexTemplateMeta,
} from './register_datastream_route';

export function registerComponentTemplateRoutes(dependencies: RouteDependencies) {
  registerGetAllRoute(dependencies);
  registerCreateRoute(dependencies);
  registerUpdateRoute(dependencies);
  registerGetDatastreams(dependencies);
  registerReferencedIndexTemplateMeta(dependencies);
  registerDeleteRoute(dependencies);
  registerPrivilegesRoute(dependencies);
}
