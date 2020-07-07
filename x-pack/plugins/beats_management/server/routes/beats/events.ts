/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { ReturnTypeBulkAction } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

/*
import Joi from 'joi';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';
export const beatEventsRoute = (libs: CMServerLibs) => ({
  method: 'POST',
  path: '/api/beats/{beatId}/events',
  config: {
    validate: {
      headers: Joi.object({
        'kbn-beats-access-token': Joi.string().required(),
      }).options({ allowUnknown: true }),
    },
    auth: false,
  },
  handler: async (request: FrameworkRequest): Promise<BaseReturnType | ReturnTypeBulkAction> => {
    const beatId = request.params.beatId;
    const events = request.payload;
    const accessToken = request.headers['kbn-beats-access-token'];

    const beat = await libs.beats.getById(libs.framework.internalUser, beatId);
    if (beat === null) {
      return { error: { message: `Beat "${beatId}" not found`, code: 400 }, success: false };
    }

    const isAccessTokenValid = beat.access_token === accessToken;
    if (!isAccessTokenValid) {
      return { error: { message: `Invalid access token`, code: 401 }, success: false };
    }

    const results = await libs.beatEvents.log(libs.framework.internalUser, beat.id, events);

    return {
      results,
      success: true,
    };
  },
});
*/

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
