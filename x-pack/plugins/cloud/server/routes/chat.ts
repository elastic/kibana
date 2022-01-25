/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { HttpResources } from '../../../../../src/core/server';
import { GET_CHAT_TOKEN_ROUTE_PATH } from '../../common/constants';
import type { GetChatTokenResponseBody } from '../../common/types';
import { generateSignedJwt } from '../util/generate_jwt';

export const registerChatRoute = ({
  httpResources,
  chatIdentitySecret,
}: {
  httpResources: HttpResources;
  chatIdentitySecret: string;
}) => {
  httpResources.register(
    {
      // Use the build number in the URL path to leverage max-age caching on production builds
      path: GET_CHAT_TOKEN_ROUTE_PATH,
      validate: {
        query: schema.object({
          userId: schema.string(),
        }),
      },
      options: {
        authRequired: false,
      },
    },
    async (context, request, response) => {
      const {
        query: { userId },
      } = request;
      const token = generateSignedJwt(userId, chatIdentitySecret);
      const body: GetChatTokenResponseBody = { token };
      return response.ok({ body });
    }
  );
};
