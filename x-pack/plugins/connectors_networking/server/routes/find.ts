/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  Logger,
} from 'src/core/server';
import { IRouter } from 'kibana/server';
import { BASE_ROUTE } from './index';
import { createConnectorsNetworkingHttpClient } from '../http_client';

export function installFindRoute(router: IRouter, logger: Logger) {
  const routeConfig = {
    path: `${BASE_ROUTE}/_find`,
    validate: {},
  };
  router.get(routeConfig, (ctx, req, res) => routeHandler(ctx, req, res, logger));
}

async function routeHandler(
  ctx: RequestHandlerContext,
  req: KibanaRequest,
  res: KibanaResponseFactory,
  logger: Logger
) {
  logger.debug(`http route: find`);

  const client = createConnectorsNetworkingHttpClient(ctx, logger);

  const cos = await client.find();
  return res.ok({ body: cos });
}
