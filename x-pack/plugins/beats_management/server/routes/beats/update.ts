/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ensureRawRequest } from '../../../../../../src/core/server/http/router';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { CMBeat } from '../../../common/domain_types';
import { ReturnTypeUpdate } from '../../../common/return_types';
import { internalUser } from '../../lib/adapters/framework/adapter_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

/*
import Joi from 'joi';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';
export const createBeatUpdateRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/agent/{beatId}',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      headers: Joi.object({
        'kbn-beats-access-token': Joi.string(),
      }).options({
        allowUnknown: true,
      }),
      params: Joi.object({
        beatId: Joi.string(),
      }),
      payload: Joi.object({
        active: Joi.bool(),
        ephemeral_id: Joi.string(),
        host_name: Joi.string(),
        local_configuration_yml: Joi.string(),
        metadata: Joi.object(),
        name: Joi.string(),
        type: Joi.string(),
        version: Joi.string(),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest
  ): Promise<BaseReturnType | ReturnTypeUpdate<CMBeat>> => {
    const { beatId } = request.params;
    const accessToken = request.headers['kbn-beats-access-token'];
    const remoteAddress = request.info.remoteAddress;
    const userOrToken = accessToken || request.user;

    if (request.user.kind === 'unauthenticated' && request.payload.active !== undefined) {
      return {
        error: {
          message: 'access-token is not a valid auth type to change beat status',
          code: 401,
        },
        success: false,
      };
    }

    const status = await libs.beats.update(userOrToken, beatId, {
      ...request.payload,
      host_ip: remoteAddress,
    });

    switch (status) {
      case 'beat-not-found':
        return {
          error: {
            message: 'Beat not found',
            code: 404,
          },
          success: false,
        };
      case 'invalid-access-token':
        return {
          error: {
            message: 'Invalid access token',
            code: 401,
          },
          success: false,
        };
    }

    const beat = await libs.beats.getById(internalUser, beatId);

    if (!beat) {
      return {
        error: {
          message: 'Beat not found',
          code: 404,
        },
        success: false,
      };
    }

    return {
      item: beat,
      action: 'updated',
      success: true,
    };
  },
});
*/

export const registerBeatUpdateRoute = (router: IRouter) => {
  // TODO: write to Kibana audit log file (include who did the verification as well) https://github.com/elastic/kibana/issues/26024
  router.put(
    {
      path: '/api/beats/agent/{beatId}',
      validate: {
        params: schema.object({
          beatId: schema.string(),
        }),
        body: schema.object(
          {
            active: schema.maybe(schema.boolean()),
            ephemeral_id: schema.maybe(schema.string()),
            host_name: schema.maybe(schema.string()),
            local_configuration_yml: schema.maybe(schema.string()),
            metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),
            name: schema.maybe(schema.string()),
            type: schema.maybe(schema.string()),
            version: schema.maybe(schema.string()),
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
        const accessToken = request.headers['kbn-beats-access-token'] as string;
        const { beatId } = request.params;
        const user = beatsManagement.framework.getUser(request);
        const userOrToken = accessToken || user;

        // TODO: fixme eventually, need to access `info.remoteAddress` from KibanaRequest.
        const legacyRequest = ensureRawRequest(request);
        const remoteAddress = legacyRequest.info.remoteAddress;

        if (user.kind === 'unauthenticated' && request.body.active !== undefined) {
          return response.unauthorized({
            body: {
              message: 'access-token is not a valid auth type to change beat status',
            },
          });
        }

        const status = await beatsManagement.beats.update(userOrToken, beatId, {
          ...request.body,
          host_ip: remoteAddress,
        });

        switch (status) {
          case 'beat-not-found':
            return response.notFound({
              body: {
                message: 'Beat not found',
              },
            });
          case 'invalid-access-token':
            return response.unauthorized({
              body: {
                message: 'Invalid access token',
              },
            });
        }

        const beat = await beatsManagement.beats.getById(internalUser, beatId);
        if (!beat) {
          return response.notFound({
            body: {
              message: 'Beat not found',
            },
          });
        }

        return response.ok({
          body: {
            item: beat,
            action: 'updated',
            success: true,
          } as ReturnTypeUpdate<CMBeat>,
        });
      }
    )
  );
};
