/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../src/core/server';
import { initSavedQueryRoutes } from './saved_query';
import { initActionRoutes } from './action';

export const defineRoutes = (router: IRouter) => {
  initActionRoutes(router);
  initSavedQueryRoutes(router);
};
