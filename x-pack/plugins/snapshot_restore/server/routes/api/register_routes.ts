/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getAll, getOne } from './repositories';

export const registerRoutes = (router: any): void => {
  router[getAll.method](getAll.path, getAll.handler);
  router[getOne.method](getOne.path, getOne.handler);
};
