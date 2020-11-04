/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { CMBeat } from '../../../common/domain_types';
import { ReturnTypeGet } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

export const registerGetBeatRoute = (router: IRouter) => {
  router.get(
    {
      path: '/api/beats/agent/{beatId}/{token?}',
      validate: {
        params: schema.object({
          beatId: schema.string(),
          token: schema.string({ defaultValue: '' }),
        }),
      },
    },
    wrapRouteWithSecurity(
      { requiredRoles: ['beats_admin'] },
      async (context, request, response) => {
        const beatsManagement = context.beatsManagement!;
        const user = beatsManagement.framework.getUser(request);
        const beatId = request.params.beatId;

        let beat: CMBeat | null;
        if (beatId === 'unknown') {
          beat = await beatsManagement.beats.getByEnrollmentToken(user, request.params.token);
          if (beat === null) {
            return response.ok({ body: { success: false } });
          }
        } else {
          beat = await beatsManagement.beats.getById(user, beatId);
          if (beat === null) {
            return response.notFound({
              body: {
                message: 'Beat not found',
              },
            });
          }
        }

        delete beat.access_token;

        return response.ok({
          body: {
            item: beat,
            success: true,
          } as ReturnTypeGet<CMBeat>,
        });
      }
    )
  );
};
