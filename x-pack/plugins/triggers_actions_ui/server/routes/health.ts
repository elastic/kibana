/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { Logger } from '@kbn/core/server';

export function createHealthRoute(
  logger: Logger,
  router: IRouter,
  baseRoute: string,
  isAlertsAvailable: boolean
) {
  const path = `${baseRoute}/_health`;
  logger.debug(`registering triggers_actions_ui health route GET ${path}`);
  router.get(
    {
      path,
      validate: false,
    },
    handler
  );
  async function handler(
    ctx: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, unknown>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    const result = { isAlertsAvailable };

    logger.debug(`route ${path} response: ${JSON.stringify(result)}`);
    return res.ok({ body: result });
  }
}
