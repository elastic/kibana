/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext as CommonFtrProviderContext } from '../../../common/ftr_provider_context';
import { USERS, ROLES } from './authentication';
import { User, Role } from './types';

export const createUsersAndRoles = async (getService: CommonFtrProviderContext['getService']) => {
  const security = getService('security');

  const createRole = async ({ name, privileges }: Role) => {
    return await security.role.create(name, privileges);
  };

  const createUser = async ({ username, password, roles, superuser }: User) => {
    // no need to create superuser
    if (superuser) {
      return;
    }

    return await security.user.create(username, {
      password,
      roles,
      full_name: username.replace('_', ' '),
      email: `${username}@elastic.co`,
    });
  };

  for (const role of Object.values(ROLES)) {
    await createRole(role);
  }

  for (const user of Object.values(USERS)) {
    await createUser(user);
  }
};
