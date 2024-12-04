/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchRoutes } from './search';
import { typeDefinitionRoutes } from './type_definition_routes';
import { sourceDefinitionRoutes } from './source_definition_routes';

export const v2Routes = {
  ...searchRoutes,
  ...typeDefinitionRoutes,
  ...sourceDefinitionRoutes,
};
