/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { ConfigurationBlock } from '../../../common/domain_types';
import { ReturnTypeList } from '../../../common/return_types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

export const registerGetBeatConfigurationRoute = (router: IRouter) => {
  router.get(
    {
      path: '/api/beats/agent/{beatId}/configuration',
      validate: {
        params: schema.object({
          beatId: schema.string(),
        }),
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

      let configurationBlocks: ConfigurationBlock[];
      const beat = await beatsManagement.beats.getById(
        beatsManagement.framework.internalUser,
        beatId
      );
      if (beat === null) {
        return response.notFound({
          body: {
            message: `Beat "${beatId}" not found`,
          },
        });
      }

      const isAccessTokenValid = beat.access_token === accessToken;
      if (!isAccessTokenValid) {
        return response.unauthorized({
          body: {
            message: 'Invalid access token',
          },
        });
      }

      await beatsManagement.beats.update(beatsManagement.framework.internalUser, beat.id, {
        last_checkin: new Date(),
      });

      if (beat.tags) {
        const result = await beatsManagement.configurationBlocks.getForTags(
          beatsManagement.framework.internalUser,
          beat.tags,
          -1
        );

        configurationBlocks = result.blocks;
      } else {
        configurationBlocks = [];
      }

      return response.ok({
        body: {
          list: configurationBlocks,
          success: true,
        } as ReturnTypeList<ConfigurationBlock>,
      });
    })
  );
};
