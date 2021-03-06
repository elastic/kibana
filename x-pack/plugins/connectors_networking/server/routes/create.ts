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
import { ConnectorOptionsSchema, ConnectorOptions, ConnectorOptionsWithId } from '../types';
import { createConnectorsNetworkingHttpClient } from '../http_client';

export function installCreateRoute(router: IRouter, logger: Logger) {
  const routeConfig = {
    path: `${BASE_ROUTE}`,
    validate: {
      body: ConnectorOptionsSchema,
    },
  };
  router.post(routeConfig, (ctx, req, res) => routeHandler(ctx, req, res, logger));
}

async function routeHandler(
  ctx: RequestHandlerContext,
  req: KibanaRequest<unknown, unknown, ConnectorOptions>,
  res: KibanaResponseFactory,
  logger: Logger
) {
  logger.debug(`http route: create`);

  const client = createConnectorsNetworkingHttpClient(ctx, logger);

  let co: ConnectorOptionsWithId;
  try {
    co = await client.create(req.body);
  } catch (err) {
    return res.badRequest({ body: 'invalid connector options' });
  }

  return res.ok({ body: co });
}
