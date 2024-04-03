/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import type { SecurityPluginSetup, AuthenticatedUser } from '@kbn/security-plugin/server';
import { GET_CHAT_USER_DATA_ROUTE_PATH } from '../../common/constants';
import type { GetChatUserDataResponseBody, ChatVariant } from '../../common/types';
import { generateSignedJwt } from '../util/generate_jwt';
import { isTodayInDateWindow } from '../../common/util';

type MetaWithSaml = AuthenticatedUser['metadata'] & {
  saml_name: [string];
  saml_email: [string];
  saml_roles: [string];
  saml_principal: [string];
};

export const registerChatRoute = ({
  router,
  chatIdentitySecret,
  trialEndDate,
  trialBuffer,
  security,
  isDev,
  getChatVariant,
  getChatDisabledThroughExperiments,
}: {
  router: IRouter;
  chatIdentitySecret: string;
  trialEndDate?: Date;
  trialBuffer: number;
  security?: SecurityPluginSetup;
  isDev: boolean;
  getChatVariant: () => Promise<ChatVariant>;
  /**
   * Returns true if chat is disabled in LaunchDarkly
   * Meant to be used as a runtime kill switch
   */
  getChatDisabledThroughExperiments: () => Promise<boolean>;
}) => {
  if (!security) {
    return;
  }

  router.get(
    {
      path: GET_CHAT_USER_DATA_ROUTE_PATH,
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

      if (!trialEndDate) {
        return response.badRequest({
          body: 'Chat can only be started if a trial end date is specified',
        });
      }

      if (!trialEndDate || !isTodayInDateWindow(trialEndDate, trialBuffer)) {
        return response.badRequest({
          body: 'Chat can only be started during trial and trial chat buffer',
        });
      }

      if (await getChatDisabledThroughExperiments()) {
        return response.badRequest({
          body: 'Chat is disabled through experiments',
        });
      }

      const token = generateSignedJwt(userId, chatIdentitySecret);
      const body: GetChatUserDataResponseBody = {
        token,
        email: userEmail,
        id: userId,
        chatVariant: await getChatVariant(),
      };
      return response.ok({ body });
    }
  );
};
