/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User, Role } from './types';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export const createUsersAndRoles = async (
  getService: FtrProviderContext['getService'],
  usersToCreate: User[],
  rolesToCreate: Role[]
): Promise<void> => {
  const security = getService('security');

  await Promise.all(
    rolesToCreate.map(({ name, privileges }) => security.role.create(name, privileges))
  );
  await Promise.all(
    usersToCreate.map((user) =>
      security.user.create(user.username, {
        password: user.password,
        roles: user.roles,
        full_name: user.username.replace(/_/g, ' '),
        email: `${user.username}@elastic.co`,
      })
    )
  );
};

export const deleteUsersAndRoles = async (
  getService: FtrProviderContext['getService'],
  usersToDelete: User[],
  rolesToDelete: Role[]
): Promise<void> => {
  const security = getService('security');

  try {
    await Promise.allSettled(usersToDelete.map((user) => security.user.delete(user.username)));
  } catch (error) {
    // ignore
  }

  try {
    await Promise.allSettled(rolesToDelete.map((role) => security.role.delete(role.name)));
  } catch (error) {
    // ignore
  }
};
