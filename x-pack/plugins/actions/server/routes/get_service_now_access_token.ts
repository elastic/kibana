/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, Logger } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../common';
import { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';
import { getAccessToken } from '../builtin_action_types/servicenow/utils';
import { ActionsConfigurationUtilities } from '../actions_config';

const bodySchema = schema.object({
  apiUrl: schema.string(),
  config: schema.object({
    clientId: schema.string(),
    jwtKeyId: schema.string(),
    userIdentifierValue: schema.string(),
  }),
  secrets: schema.object({
    clientSecret: schema.string(),
    privateKey: schema.string(),
    privateKeyPassword: schema.maybe(schema.string()),
  }),
});

export const getServiceNowAccessToken = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/_servicenow_access_token`,
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { apiUrl, config, secrets } = req.body;
        const accessToken = await getAccessToken({
          logger,
          configurationUtilities,
          credentials: {
            config: {
              ...config,
              isOAuth: true,
            },
            secrets,
          },
          snServiceUrl: apiUrl,
        });

        return res.ok({
          body: { accessToken },
        });
      })
    )
  );
};
