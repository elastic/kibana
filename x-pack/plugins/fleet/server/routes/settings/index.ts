/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';

import type { IRouter, RequestHandler } from '../../../../../../src/core/server/http/router/router';
import { PLUGIN_ID } from '../../../common/constants/plugin';
import { SETTINGS_API_ROUTES } from '../../../common/constants/routes';
import { defaultIngestErrorHandler } from '../../errors/handlers';
import { agentPolicyService } from '../../services/agent_policy';
import { appContextService } from '../../services/app_context';
import * as settingsService from '../../services/settings';
import { GetSettingsRequestSchema, PutSettingsRequestSchema } from '../../types/rest_spec/settings';

export const getSettingsHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;

  try {
    const settings = await settingsService.getSettings(soClient);
    const body = {
      item: settings,
    };
    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Setings not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};

export const putSettingsHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutSettingsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);

  try {
    const settings = await settingsService.saveSettings(soClient, request.body);
    await agentPolicyService.bumpAllAgentPolicies(soClient, esClient, {
      user: user || undefined,
    });
    const body = {
      item: settings,
    };
    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Setings not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};

export const registerRoutes = (router: IRouter) => {
  router.get(
    {
      path: SETTINGS_API_ROUTES.INFO_PATTERN,
      validate: GetSettingsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getSettingsHandler
  );
  router.put(
    {
      path: SETTINGS_API_ROUTES.UPDATE_PATTERN,
      validate: PutSettingsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    putSettingsHandler
  );
};
