/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../src/core/server';
import type { SecurityPluginSetup } from '../../../security/server';
import { GET_CHAT_USER_DATA_ROUTE_PATH } from '../../common/constants';
import type { GetChatUserDataResponseBody } from '../../common/types';
import { generateSignedJwt } from '../util/generate_jwt';

export const registerChatRoute = ({
  router,
  chatIdentitySecret,
  security,
}: {
  router: IRouter;
  chatIdentitySecret: string;
  security?: SecurityPluginSetup;
}) => {
  router.get(
    {
      path: GET_CHAT_USER_DATA_ROUTE_PATH,
      validate: {},
    },
    async (context, request, response) => {
      if (!security) {
        return response.customError({
          statusCode: 500,
        });
      }

      const user = await security.authc.getCurrentUser(request);
      let { email: userEmail, username: userID } = user || {};
      // TODO: this is for testing purpose, cz a user in local env
      // doesn't have an email
      userEmail = userEmail || `test+${userID}@elasticsearch.com`;

      if (!userEmail || !userID) {
        return response.badRequest({
          body: 'User has no email or username',
        });
      }

      const token = generateSignedJwt(userID, chatIdentitySecret);
      const body: GetChatUserDataResponseBody = {
        token,
        email: userEmail,
        id: userID,
      };
      return response.ok({ body });
    }
  );
};
