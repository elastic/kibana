/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import type { Logger } from 'src/core/server';
import { PLUGIN_ID } from '../types';
import { installCreateRoute } from './create';
import { installDeleteRoute } from './delete';
import { installFindRoute } from './find';
import { installFindForUrlRoute } from './find_for_url';
import { installGetRoute } from './get';
import { installUpdateRoute } from './update';

export const BASE_ROUTE = `/api/${PLUGIN_ID}`;

export function defineRoutes(router: IRouter, logger: Logger) {
  installCreateRoute(router, logger);
  installDeleteRoute(router, logger);
  installFindRoute(router, logger);
  installFindForUrlRoute(router, logger);
  installGetRoute(router, logger);
  installUpdateRoute(router, logger);
}
