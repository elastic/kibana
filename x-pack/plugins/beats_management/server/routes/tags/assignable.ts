/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { flatten } from 'lodash';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { BeatTag } from '../../../common/domain_types';
import { ReturnTypeBulkGet } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

export const registerAssignableTagsRoute = (router: IRouter) => {
  router.get(
    {
      path: '/api/beats/tags/assignable/{beatIds}',
      validate: {
        params: schema.object({
          beatIds: schema.string(),
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
        const beatIds = request.params.beatIds.split(',').filter((id) => id.length > 0);

        const beats = await beatsManagement.beats.getByIds(user, beatIds);
        const tags = await beatsManagement.tags.getNonConflictingTags(
          user,
          flatten(beats.map((beat) => beat.tags))
        );

        return response.ok({
          body: {
            items: tags,
            success: true,
          } as ReturnTypeBulkGet<BeatTag>,
        });
      }
    )
  );
};
