/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../src/core/server';
import { initActionRoutes } from './action';
import { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { initSavedQueryRoutes } from './saved_query';
import { initPackRoutes } from './pack';

export const defineRoutes = (router: IRouter, context: OsqueryAppContext) => {
  const config = context.config();

  initActionRoutes(router, context);

  if (config.packs) {
    initPackRoutes(router);
  }

  if (config.savedQueries) {
    initSavedQueryRoutes(router);
  }
};
