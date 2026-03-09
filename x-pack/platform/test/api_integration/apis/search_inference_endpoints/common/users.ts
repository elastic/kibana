/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from './types';
import { ROLES } from './roles';

export const inferenceSettingsNoAccessUser: User = {
  username: 'inference_settings_test_no_access',
  password: 'password',
  roles: [ROLES.NO_ACCESS.name],
};

export const USERS = {
  NO_ACCESS: inferenceSettingsNoAccessUser,
};

export const ALL_USERS = Object.values(USERS);
