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

type Body = TypeOf<typeof BodySchema>;
const BodySchema = schema.object({
  url: schema.string(),
});

export function installFindForUrlRoute(router: IRouter, logger: Logger) {
  const routeConfig = {
    path: `${BASE_ROUTE}/_find_for_url`,
    validate: {
      body: BodySchema,
    },
  };
  router.post(routeConfig, (ctx, req, res) => routeHandler(ctx, req, res, logger));
}

async function routeHandler(
  ctx: RequestHandlerContext,
  req: KibanaRequest<unknown, unknown, Body>,
  res: KibanaResponseFactory,
  logger: Logger
) {
  logger.debug(`http route: find_for_url: "${req.body.url}"`);

  const client = createConnectorsNetworkingHttpClient(ctx, logger);
  let co: ConnectorOptionsWithId | undefined;

  try {
    co = await client.findForUrl(req.body.url);
  } catch (err) {
    co = undefined;
  }

  return co ? res.ok({ body: co }) : res.notFound();
}
