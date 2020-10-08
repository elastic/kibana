/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ReturnTypeBulkAction } from '../../../common/return_types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { BeatsTagAssignment } from '../../../public/lib/adapters/beats/adapter_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

export const registerTagAssignmentsRoute = (router: IRouter) => {
  // TODO: write to Kibana audit log file https://github.com/elastic/kibana/issues/26024
  router.post(
    {
      path: '/api/beats/agents_tags/assignments',
      validate: {
        body: schema.object({
          assignments: schema.arrayOf(
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
        const { assignments }: { assignments: BeatsTagAssignment[] } = request.body;

        const result = await beatsManagement.beats.assignTagsToBeats(user, assignments);

        return response.ok({
          body: {
            success: true,
            results: result.assignments.map((assignment) => ({
              success: assignment.status && assignment.status >= 200 && assignment.status < 300,
              error:
                !assignment.status || assignment.status >= 300
                  ? {
                      code: assignment.status || 400,
                      message: assignment.result,
                    }
                  : undefined,
              result:
                assignment.status && assignment.status >= 200 && assignment.status < 300
                  ? {
                      message: assignment.result,
                    }
                  : undefined,
            })),
          } as ReturnTypeBulkAction,
        });
      }
    )
  );
};
