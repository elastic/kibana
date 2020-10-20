/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ReturnTypeBulkDelete } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

export const registerDeleteTagsWithIdsRoute = (router: IRouter) => {
  router.delete(
    {
      path: '/api/beats/tags/{tagIds}',
      validate: {
        params: schema.object({
          tagIds: schema.string(),
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
        const user = beatsManagement.framework.getUser(request);
        const tagIds = request.params.tagIds.split(',').filter((id) => id.length > 0);

        const success = await beatsManagement.tags.delete(user, tagIds);

        return response.ok({
          body: {
            results: tagIds.map(() => ({
              success,
              action: 'deleted',
            })),
            success,
          } as ReturnTypeBulkDelete,
        });
      }
    )
  );
};
