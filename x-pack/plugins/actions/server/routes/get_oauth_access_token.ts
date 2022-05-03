/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { IRouter, Logger } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../common';
import { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';
import { ActionsConfigurationUtilities } from '../actions_config';
import {
  getOAuthJwtAccessToken,
  GetOAuthJwtConfig,
  GetOAuthJwtSecrets,
} from '../builtin_action_types/lib/get_oauth_jwt_access_token';
import {
  getOAuthClientCredentialsAccessToken,
  GetOAuthClientCredentialsConfig,
  GetOAuthClientCredentialsSecrets,
} from '../builtin_action_types/lib/get_oauth_client_credentials_access_token';

const oauthJwtBodySchema = schema.object({
  tokenUrl: schema.string(),
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

type OAuthJwtParams = TypeOf<typeof oauthJwtBodySchema>;

const oauthClientCredentialsBodySchema = schema.object({
  tokenUrl: schema.string(),
  scope: schema.string(),
  config: schema.object({
    clientId: schema.string(),
    tenantId: schema.string(),
  }),
  secrets: schema.object({
    clientSecret: schema.string(),
  }),
});

type OAuthClientCredentialsParams = TypeOf<typeof oauthClientCredentialsBodySchema>;

const bodySchema = schema.object({
  type: schema.oneOf([schema.literal('jwt'), schema.literal('client')]),
  options: schema.conditional(
    schema.siblingRef('type'),
    schema.literal('jwt'),
    oauthJwtBodySchema,
    oauthClientCredentialsBodySchema
  ),
});

export const getOAuthAccessToken = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/_oauth_access_token`,
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { type, options } = req.body;

        let accessToken: string | null = null;
        if (type === 'jwt') {
          const tokenOpts = options as OAuthJwtParams;
          accessToken = await getOAuthJwtAccessToken({
            logger,
            configurationUtilities,
            credentials: {
              config: tokenOpts.config as GetOAuthJwtConfig,
              secrets: tokenOpts.secrets as GetOAuthJwtSecrets,
            },
            tokenUrl: tokenOpts.tokenUrl,
          });
        } else if (type === 'client') {
          const tokenOpts = options as OAuthClientCredentialsParams;
          accessToken = await getOAuthClientCredentialsAccessToken({
            logger,
            configurationUtilities,
            credentials: {
              config: tokenOpts.config as GetOAuthClientCredentialsConfig,
              secrets: tokenOpts.secrets as GetOAuthClientCredentialsSecrets,
            },
            tokenUrl: tokenOpts.tokenUrl,
            oAuthScope: tokenOpts.scope,
          });
        }

        return res.ok({
          body: { accessToken },
        });
      })
    )
  );
};
