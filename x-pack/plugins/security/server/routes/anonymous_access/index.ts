/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defineCanAccessSavedObjectTypeRoutes } from './can_access_saved_object_type';
import { RouteDefinitionParams } from '..';

export function defineAnonymousAccessRoutes(params: RouteDefinitionParams) {
  defineCanAccessSavedObjectTypeRoutes(params);
}
