/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { registerCreateTagRoute } from './create_tag';
import { registerDeleteTagRoute } from './delete_tag';
import { registerGetAllTagsRoute } from './get_all_tags';
import { registerGetTagRoute } from './get_tag';
import { registerUpdateTagRoute } from './update_tag';
import { registerInternalFindTagsRoute } from './internal';

export const registerRoutes = ({ router }: { router: IRouter }) => {
  // public API
  registerCreateTagRoute(router);
  registerUpdateTagRoute(router);
  registerDeleteTagRoute(router);
  registerGetAllTagsRoute(router);
  registerGetTagRoute(router);
  // internal API
  registerInternalFindTagsRoute(router);
};
