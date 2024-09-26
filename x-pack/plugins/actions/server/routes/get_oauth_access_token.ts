/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../common';
import { ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';
import { ActionsConfigurationUtilities } from '../actions_config';

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

export type OAuthJwtParams = TypeOf<typeof oauthJwtBodySchema>;

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

export type OAuthClientCredentialsParams = TypeOf<typeof oauthClientCredentialsBodySchema>;

const bodySchema = schema.object({
  type: schema.oneOf([schema.literal('jwt'), schema.literal('client')]),
  options: schema.conditional(
    schema.siblingRef('type'),
    schema.literal('jwt'),
    oauthJwtBodySchema,
    oauthClientCredentialsBodySchema
  ),
});

export type OAuthParams = TypeOf<typeof bodySchema>;

export const getOAuthAccessToken = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  configurationUtilities: ActionsConfigurationUtilities
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/_oauth_access_token`,
      validate: {
        body: bodySchema,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        return res.ok({
          body: await actionsClient.getOAuthAccessToken(req.body, configurationUtilities),
        });
      })
    )
  );
};
