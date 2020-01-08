/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';
import { registerInfoRoute } from './info';

export function registerRoutes(router: IRouter) {
  registerInfoRoute(router);
}
