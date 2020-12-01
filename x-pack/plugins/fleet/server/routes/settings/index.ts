/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter, RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { PLUGIN_ID, SETTINGS_API_ROUTES } from '../../constants';
import { PutSettingsRequestSchema, GetSettingsRequestSchema } from '../../types';
import { defaultIngestErrorHandler } from '../../errors';
import { settingsService, agentPolicyService, appContextService } from '../../services';

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
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);
  try {
    const settings = await settingsService.saveSettings(soClient, request.body);
    await agentPolicyService.bumpAllAgentPolicies(soClient, {
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
