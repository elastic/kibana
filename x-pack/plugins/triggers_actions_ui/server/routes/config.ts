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
} from 'kibana/server';
import { Logger } from '../../../../../src/core/server';
import { AlertingRulesConfig } from '../../../alerting/server';

export function createConfigRoute(
  logger: Logger,
  router: IRouter,
  baseRoute: string,
  config?: AlertingRulesConfig
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
    return res.ok({ body: config ?? {} });
  }
}
