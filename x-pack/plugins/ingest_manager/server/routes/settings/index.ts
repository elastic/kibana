/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter, RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { PLUGIN_ID, SETTINGS_API_ROUTES } from '../../constants';
import { PutSettingsRequestSchema, GetSettingsRequestSchema } from '../../types';

import { settingsService } from '../../services';

export const getSettingsHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;

  try {
    const settings = await settingsService.getSettings(soClient);
    const body = {
      success: true,
      item: settings,
    };
    return response.ok({ body });
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Setings not found` },
      });
    }

    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const putSettingsHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutSettingsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const settings = await settingsService.saveSettings(soClient, request.body);
    const body = {
      success: true,
      item: settings,
    };
    return response.ok({ body });
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Setings not found` },
      });
    }

    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
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
