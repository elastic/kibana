/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USER_PREFERENCES_URL } from '../../../../common/constants';
import { UserPreferencesService } from './service/user_preferences_services';
import type { RegisterUserProfileSettingsRoutesParams } from './types';

export const updateUserPrefsRoute = async ({
  router,
  logger,
  getStartServices,
}: RegisterUserProfileSettingsRoutesParams) => {
  const startServices = await getStartServices();
  const [, { security: securityService }] = startServices;

  const userProfileService = securityService.userProfiles;
  const securitySolutionUserPreferencesService = new UserPreferencesService(userProfileService);

  router.versioned
    .post({
      path: USER_PREFERENCES_URL,
      access: 'public',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      async (context, request, response) => {
        try {
          logger.debug(`Updating user preferences: ${JSON.stringify(request)}`);
          await securitySolutionUserPreferencesService.update(request, request.body);
          return response.ok();
        } catch (err) {
          logger.error(`Failed to retrieve user profile: ${err}`);
          return response.customError(err);
        }
      }
    );
};
