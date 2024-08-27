/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { setDefaultSpaceSolutionType } from './set_default_space_solution';
import { CloudRequestHandlerContext } from './types';

export interface RouteOptions {
  router: IRouter<CloudRequestHandlerContext>;
  getSpacesService: () => Promise<SpacesPluginStart['spacesService']>;
}

export function defineRoutes(opts: RouteOptions) {
  const { router, getSpacesService } = opts;

  setDefaultSpaceSolutionType({ router, getSpacesService });
}
