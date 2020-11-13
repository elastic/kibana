/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ReturnTypeBulkCreate } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

const DEFAULT_NUM_TOKENS = 1;

export const registerCreateTokenRoute = (router: IRouter) => {
  // TODO: write to Kibana audit log file
  router.post(
    {
      path: '/api/beats/enrollment_tokens',
      validate: {
        body: schema.nullable(
          schema.object({
            num_tokens: schema.number({ defaultValue: DEFAULT_NUM_TOKENS, min: 1 }),
          })
        ),
      },
    },
    wrapRouteWithSecurity(
      {
        requiredLicense: REQUIRED_LICENSES,
        requiredRoles: ['beats_admin'],
      },
      async (context, request, response) => {
        const beatsManagement = context.beatsManagement!;
        const user = beatsManagement.framework.getUser(request);

        const numTokens = request.body?.num_tokens ?? DEFAULT_NUM_TOKENS;
        try {
          const tokens = await beatsManagement.tokens.createEnrollmentTokens(user, numTokens);
          return response.ok({
            body: {
              results: tokens.map((token) => ({
                item: token,
                success: true,
                action: 'created',
              })),
              success: true,
            } as ReturnTypeBulkCreate<string>,
          });
        } catch (err) {
          beatsManagement.framework.log(err.message);
          return response.internalError({
            body: {
              message: 'An error occurred, please check your Kibana logs',
            },
          });
        }
      }
    )
  );
};
