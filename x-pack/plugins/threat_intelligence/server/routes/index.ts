/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { registerSourceListRoute } from './source_list';

export function registerRoutes(router: IRouter<DataRequestHandlerContext>) {
  registerSourceListRoute(router);
}
