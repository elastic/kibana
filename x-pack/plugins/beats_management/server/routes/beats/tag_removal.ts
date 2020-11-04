/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ReturnTypeBulkAction } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

export const registerTagRemovalsRoute = (router: IRouter) => {
  // TODO: write to Kibana audit log file https://github.com/elastic/kibana/issues/26024
  router.post(
    {
      path: '/api/beats/agents_tags/removals',
      validate: {
        body: schema.object({
          removals: schema.arrayOf(
            schema.object({
              beatId: schema.string(),
              tag: schema.string(),
            }),
            { defaultValue: [] }
          ),
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
        const { removals } = request.body;

        const result = await beatsManagement.beats.removeTagsFromBeats(user, removals);

        return response.ok({
          body: {
            success: true,
            results: result.removals.map((removal) => ({
              success: removal.status && removal.status >= 200 && removal.status < 300,
              error:
                !removal.status || removal.status >= 300
                  ? {
                      code: removal.status || 400,
                      message: removal.result,
                    }
                  : undefined,
              result:
                removal.status && removal.status >= 200 && removal.status < 300
                  ? {
                      message: removal.result,
                    }
                  : undefined,
            })),
          } as ReturnTypeBulkAction,
        });
      }
    )
  );
};
