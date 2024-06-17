/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, StartServicesAccessor } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_ALERT_SUGGEST_USERS_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import type { StartPlugins } from '../../../../plugin';
import { buildRouteValidationWithZod } from '../../../../utils/build_validation/route_validation';
import { SuggestUserProfilesRequestQuery } from '../../../../../common/api/detection_engine/users';

export const suggestUserProfilesRoute = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .get({
      path: DETECTION_ENGINE_ALERT_SUGGEST_USERS_URL,
      access: 'internal',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: buildRouteValidationWithZod(SuggestUserProfilesRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<UserProfileWithAvatar[]>> => {
        const { searchTerm } = request.query;
        const siemResponse = buildSiemResponse(response);
        const [_, { security }] = await getStartServices();
        const securitySolution = await context.securitySolution;
        const spaceId = securitySolution.getSpaceId();

        try {
          const users = await security.userProfiles.suggest({
            name: searchTerm,
            dataPath: 'avatar',
            requiredPrivileges: {
              spaceId,
              privileges: {
                kibana: [security.authz.actions.login],
              },
            },
          });

          return response.ok({ body: users });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
