/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUserPrefsRoute } from './get_security_solution_user_preferences';
import type { RegisterUserProfileSettingsRoutesParams } from './types';
import { updateUserPrefsRoute } from './update_security_solution_preferences';

export const registerUserProfileSettingsRoutes = async ({
  router,
  logger,
  getStartServices,
}: RegisterUserProfileSettingsRoutesParams) => {
  getUserPrefsRoute({ router, logger, getStartServices });
  updateUserPrefsRoute({ router, logger, getStartServices });
};
