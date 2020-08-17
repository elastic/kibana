/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ReturnTypeBulkDelete } from '../../../common/return_types';

export const registerDeleteConfigurationBlocksRoute = (router: IRouter) => {
  router.delete(
    {
      path: '/api/beats/configurations/{ids}',
      validate: {
        params: schema.object({
          ids: schema.string(),
        }),
      },
    },
    wrapRouteWithSecurity(
      {
        requiredLicense: REQUIRED_LICENSES,
        requiredRoles: ['beats_admin'],
      },
      async (context, request, response) => {
        const beatsManagement = context.beatsManagement!;
        const ids = request.params.ids.split(',').filter((id) => id.length > 0);
        const user = beatsManagement.framework.getUser(request);

        const results = await beatsManagement.configurationBlocks.delete(user, ids);
        return response.ok({
          body: {
            success: true,
            results: results.map((result) => ({
              success: result.success,
              action: 'deleted',
              error: result.success ? undefined : { message: result.reason },
            })),
          } as ReturnTypeBulkDelete,
        });
      }
    )
  );
};
