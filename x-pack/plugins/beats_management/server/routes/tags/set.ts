/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { REQUIRED_LICENSES } from '../../../common/constants';
import { BeatTag } from '../../../common/domain_types';
import { ReturnTypeUpsert } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

/*
import Joi from 'joi';
import { get } from 'lodash';

import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';
export const createSetTagRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/tag/{tagId}',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      params: Joi.object({
        tagId: Joi.string(),
      }),
      payload: Joi.object({
        color: Joi.string(),
        name: Joi.string(),
      }),
    },
  },
  handler: async (request: FrameworkRequest): Promise<ReturnTypeUpsert<BeatTag>> => {
    const defaultConfig = {
      id: request.params.tagId,
      name: request.params.tagId,
      color: '#DD0A73',
      hasConfigurationBlocksTypes: [],
    };
    const config = { ...defaultConfig, ...get(request, 'payload', {}) };

    const id = await libs.tags.upsertTag(request.user, config);
    const tag = await libs.tags.getWithIds(request.user, [id]);

    // TODO the action needs to be surfaced
    return { success: true, item: tag[0], action: 'created' };
  },
});
*/

export const registerSetTagRoute = (router: IRouter) => {
  // TODO: write to Kibana audit log file
  router.put(
    {
      path: '/api/beats/tag/{tagId}',
      validate: {
        params: schema.object({
          tagId: schema.string(),
        }),
        body: schema.object(
          {
            color: schema.maybe(schema.string()),
            name: schema.maybe(schema.string()),
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

        const config = {
          id: request.params.tagId,
          name: request.params.tagId,
          color: '#DD0A73',
          hasConfigurationBlocksTypes: [],
          ...request.body,
        };
        const id = await beatsManagement.tags.upsertTag(user, config);
        const tag = await beatsManagement.tags.getWithIds(user, [id]);

        // TODO the action needs to be surfaced
        return response.ok({
          body: {
            success: true,
            item: tag[0],
            action: 'created',
          } as ReturnTypeUpsert<BeatTag>,
        });
      }
    )
  );
};
