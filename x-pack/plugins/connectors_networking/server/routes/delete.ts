/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  Logger,
} from 'src/core/server';
import { IRouter } from 'kibana/server';
import { BASE_ROUTE } from './index';
import { createConnectorsNetworkingHttpClient } from '../http_client';

type Params = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  id: schema.string(),
});

export function installDeleteRoute(router: IRouter, logger: Logger) {
  const routeConfig = {
    path: `${BASE_ROUTE}/options/{id}`,
    validate: {
      params: ParamsSchema,
    },
  };
  router.delete(routeConfig, (ctx, req, res) => routeHandler(ctx, req, res, logger));
}

async function routeHandler(
  ctx: RequestHandlerContext,
  req: KibanaRequest<Params, unknown, unknown>,
  res: KibanaResponseFactory,
  logger: Logger
) {
  logger.debug(`http route: delete: "${req.params.id}"`);

  const client = createConnectorsNetworkingHttpClient(ctx, logger);

  try {
    await client.delete(req.params.id);
  } catch (err) {
    return res.notFound();
  }

  return res.ok({
    body: {
      success: true,
    },
  });
}
