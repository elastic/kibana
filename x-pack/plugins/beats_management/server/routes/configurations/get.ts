/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { BeatsManagementRouter } from '../../lib/types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ConfigurationBlock } from '../../../common/domain_types';
import { ReturnTypeList } from '../../../common/return_types';

export const registerGetConfigurationBlocksRoute = (router: BeatsManagementRouter) => {
  router.get(
    {
      path: '/api/beats/configurations/{tagIds}/{page?}',
      validate: {
        params: schema.object({
          tagIds: schema.string(),
          page: schema.maybe(schema.number()),
        }),
      },
    },
    wrapRouteWithSecurity(
      {
        requiredLicense: REQUIRED_LICENSES,
        requiredRoles: ['beats_admin'],
      },
      async (context, request, response) => {
        const beatsManagement = context.beatsManagement;
        const tagIds = request.params.tagIds.split(',').filter((id) => id.length > 0);
        const user = beatsManagement.framework.getUser(request);
        const result = await beatsManagement.configurationBlocks.getForTags(
          user,
          tagIds,
          request.params.page,
          5
        );

        return response.ok({
          body: {
            page: result.page,
            total: result.total,
            list: result.blocks,
            success: true,
          } as ReturnTypeList<ConfigurationBlock>,
        });
      }
    )
  );
};
