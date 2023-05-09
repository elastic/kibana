/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClientAuthToken } from '@cord-sdk/server';

import { IRouter } from '@kbn/core/server';
import type { SecurityPluginSetup, AuthenticatedUser } from '@kbn/security-plugin/server';
import { PATH_GET_TOKEN } from '../../common';
import { GetCollaborationTokenDataResponseBody } from '../../common';

type MetaWithSaml = AuthenticatedUser['metadata'] & {
  saml_name: [string];
  saml_email: [string];
  saml_roles: [string];
  saml_principal: [string];
};

export const registerTokenRoute = ({
  router,
  secret,
  appId,
  cloudId,
  security,
  isDev,
}: {
  router: IRouter;
  secret?: string;
  appId?: string;
  cloudId?: string;
  security?: SecurityPluginSetup;
  isDev: boolean;
}) => {
  if (!security || !cloudId || !appId || !secret) {
    return;
  }

  router.get(
    {
      path: PATH_GET_TOKEN,
      validate: {},
    },
    async (_context, request, response) => {
      const user = security.authc.getCurrentUser(request);
      const { metadata, username } = user || {};
      let userId = username;
      let [userEmail] = (metadata as MetaWithSaml)?.saml_email || [];

      // In local development, these values are not populated.  This is a workaround
      // to allow for local testing.
      if (isDev) {
        if (!userId) {
          userId = 'first.last';
        }
        if (!userEmail) {
          userEmail = userEmail || `test+${userId}@elasticsearch.com`;
        }
      }

      if (!userEmail || !userId) {
        return response.badRequest({
          body: 'User has no email or username',
        });
      }

      const token = getClientAuthToken(appId, secret, {
        // The user ID can be any identifier that makes sense to your application.
        // As long as it's unique per-user, Cord can use it to represent your user.
        user_id: userId,

        // Same as above. An organization ID can be any unique string. Organizations
        // are groups of users.
        organization_id: cloudId,

        // By supplying the  `user_details` object, you can create the user in
        // Cord's backend on-the-fly. No need to pre-sync your users.
        user_details: {
          email: userEmail,
          name: userId,
        },

        // By supplying the `organization_details` object, just like the user,
        // Cord will create the organization on-the-fly.
        organization_details: {
          name: cloudId,
        },
      });

      const body: GetCollaborationTokenDataResponseBody = {
        token,
      };

      return response.ok({ body });
    }
  );
};
