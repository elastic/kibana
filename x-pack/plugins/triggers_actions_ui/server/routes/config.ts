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
import { RulesClientApi } from '@kbn/alerting-plugin/server/types';

export interface ConfigRouteOpts {
  logger: Logger;
  router: IRouter;
  baseRoute: string;
  // alertingConfig is a function because "isUsingSecurity" is pulled from the license
  // state which gets populated after plugin setup().
  alertingConfig: () => AlertingRulesConfig;
  getRulesClientWithRequest: (request: KibanaRequest) => Promise<RulesClientApi>;
}

export function createConfigRoute({
  logger,
  router,
  baseRoute,
  alertingConfig,
  getRulesClientWithRequest,
}: ConfigRouteOpts) {
  const path = `${baseRoute}/_config`;
  logger.debug(`registering triggers_actions_ui config route GET ${path}`);
  router.get(
    {
      path,
      validate: false,
      options: {
        access: 'internal',
      },
    },
    handler
  );
  async function handler(
    _: RequestHandlerContext,
    req: KibanaRequest<unknown, unknown, unknown>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    // Check that user has access to at least one rule type
    const rulesClient = await getRulesClientWithRequest(req);
    const ruleTypes = Array.from(await rulesClient.listRuleTypes());
    const { minimumScheduleInterval, maxScheduledPerMinute, isUsingSecurity } = alertingConfig(); // Only returns exposed config values

    if (ruleTypes.length > 0) {
      return res.ok({
        body: {
          minimumScheduleInterval,
          maxScheduledPerMinute,
          isUsingSecurity,
        },
      });
    } else {
      return res.forbidden({
        body: { message: `Unauthorized to access config` },
      });
    }
  }
}
