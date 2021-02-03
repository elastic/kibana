/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GlobalSearchRouter } from '../types';
import { registerInternalFindRoute } from './find';
import { registerInternalSearchableTypesRoute } from './get_searchable_types';

export const registerRoutes = (router: GlobalSearchRouter) => {
  registerInternalFindRoute(router);
  registerInternalSearchableTypesRoute(router);
};
