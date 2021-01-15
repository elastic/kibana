/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import {
  registerUpdateTagRoute,
  registerGetAllTagsRoute,
  registerGetTagRoute,
  registerDeleteTagRoute,
  registerCreateTagRoute,
} from './tags';
import {
  registerFindAssignableObjectsRoute,
  registerUpdateTagsAssignmentsRoute,
  registerGetAssignableTypesRoute,
} from './assignments';
import { registerInternalFindTagsRoute, registerInternalBulkDeleteRoute } from './internal';

export const registerRoutes = ({ router }: { router: IRouter }) => {
  // tags API
  registerCreateTagRoute(router);
  registerUpdateTagRoute(router);
  registerDeleteTagRoute(router);
  registerGetAllTagsRoute(router);
  registerGetTagRoute(router);
  // assignment API
  registerFindAssignableObjectsRoute(router);
  registerUpdateTagsAssignmentsRoute(router);
  registerGetAssignableTypesRoute(router);
  // internal API
  registerInternalFindTagsRoute(router);
  registerInternalBulkDeleteRoute(router);
};
