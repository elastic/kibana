/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { BeatTag } from '../../../common/domain_types';
import { ReturnTypeList } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

export const registerListTagsRoute = (router: IRouter) => {
  router.get(
    {
      path: '/api/beats/tags',
      validate: {
        query: schema.object(
          {
            ESQuery: schema.maybe(schema.string()),
          },
          { defaultValue: {} }
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

        const tags = await beatsManagement.tags.getAll(
          user,
          request.query && request.query.ESQuery ? JSON.parse(request.query.ESQuery) : undefined
        );

        return response.ok({
          body: {
            list: tags,
            success: true,
            page: -1,
            total: -1,
          } as ReturnTypeList<BeatTag>,
        });
      }
    )
  );
};
