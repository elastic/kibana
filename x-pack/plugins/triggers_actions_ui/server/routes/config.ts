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
import { AlertingRulesConfig } from '@kbn/alerting-plugin/server';

export function createConfigRoute(
  logger: Logger,
  router: IRouter,
  baseRoute: string,
  // config is a function because "isUsingSecurity" is pulled from the license
  // state which gets populated after plugin setup().
  config: () => AlertingRulesConfig
) {
  const path = `${baseRoute}/_config`;
  logger.debug(`registering triggers_actions_ui config route GET ${path}`);
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
    return res.ok({ body: config() });
  }
}
