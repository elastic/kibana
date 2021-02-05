/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'src/core/server';
import { registerInternalFindRoute } from './find';
import { registerInternalSearchableTypesRoute } from './get_searchable_types';

export const registerRoutes = (router: IRouter) => {
  registerInternalFindRoute(router);
  registerInternalSearchableTypesRoute(router);
};
