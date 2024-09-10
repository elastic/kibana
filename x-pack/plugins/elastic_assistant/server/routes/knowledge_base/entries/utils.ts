/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';

export const getKBUserFilter = (user: AuthenticatedUser | null) => {
  return user?.profile_uid ? `users.id: "${user?.profile_uid}" or NOT users: *` : 'NOT users: *';
};
