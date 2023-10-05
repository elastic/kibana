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
import { DETECTION_ENGINE_ALERT_GET_USERS_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import type { StartPlugins } from '../../../../plugin';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

import type { GetUserProfilesRequestQueryDecoded } from '../../../../../common/api/detection_engine/users';
import { getUserProfilesRequestQuery } from '../../../../../common/api/detection_engine/users';

export const getUserProfilesRoute = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .get({
      path: DETECTION_ENGINE_ALERT_GET_USERS_URL,
      access: 'public',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: buildRouteValidation<
              typeof getUserProfilesRequestQuery,
              GetUserProfilesRequestQueryDecoded
            >(getUserProfilesRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<UserProfileWithAvatar[]>> => {
        const { userIds } = request.query;
        const siemResponse = buildSiemResponse(response);
        const [_, { security }] = await getStartServices();

        try {
          const users = userIds
            ? await security.userProfiles.bulkGet({
                uids: new Set(userIds),
                dataPath: 'avatar',
              })
            : [];
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
