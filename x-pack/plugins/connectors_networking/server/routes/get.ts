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
import { ConnectorOptionsWithId } from '../types';
import { createConnectorsNetworkingHttpClient } from '../http_client';

type Params = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  id: schema.string(),
});

export function installGetRoute(router: IRouter, logger: Logger) {
  const routeConfig = {
    path: `${BASE_ROUTE}/options/{id}`,
    validate: {
      params: ParamsSchema,
    },
  };
  router.get(routeConfig, (ctx, req, res) => routeHandler(ctx, req, res, logger));
}

async function routeHandler(
  ctx: RequestHandlerContext,
  req: KibanaRequest<Params>,
  res: KibanaResponseFactory,
  logger: Logger
) {
  logger.debug(`http route: get`);

  const client = createConnectorsNetworkingHttpClient(ctx, logger);

  let co: ConnectorOptionsWithId;
  try {
    co = await client.get(req.params.id);
  } catch (err) {
    return res.notFound();
  }

  return res.ok({ body: co });
}
