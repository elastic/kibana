/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { ReturnTypeBulkAction } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

export const registerBeatEventsRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/beats/{beatId}/events',
      validate: {
        params: schema.object({
          beatId: schema.string(),
        }),
        body: schema.arrayOf(schema.any(), { defaultValue: [] }),
      },
      options: {
        authRequired: false,
      },
    },
    wrapRouteWithSecurity({}, async (context, request, response) => {
      const beatsManagement = context.beatsManagement!;
      const accessToken = request.headers['kbn-beats-access-token'];
      if (!accessToken) {
        return response.badRequest({
          body: 'beats access token required',
        });
      }
      const beatId = request.params.beatId;
      const events = request.body;
      const internalUser = beatsManagement.framework.internalUser;

      const beat = await beatsManagement.beats.getById(internalUser, beatId);
      if (beat === null) {
        return response.badRequest({
          body: {
            message: `Beat "${beatId}" not found`,
          },
        });
      }

      const isAccessTokenValid = beat.access_token === accessToken;
      if (!isAccessTokenValid) {
        return response.unauthorized({
          body: {
            message: `Invalid access token`,
          },
        });
      }

      const results = await beatsManagement.beatEvents.log(internalUser, beat.id, events);

      return response.ok({
        body: {
          results,
          success: true,
        } as ReturnTypeBulkAction,
      });
    })
  );
};
