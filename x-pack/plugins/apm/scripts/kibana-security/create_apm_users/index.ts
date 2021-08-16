/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { difference, union } from 'lodash';
import { callKibana, isAxiosError } from '../call_kibana';
import { Elasticsearch, Kibana } from '../create_kibana_user_role';
import { createRole } from './create_role';
import { powerUserRole } from './power_user_role';
import { readOnlyUserRole } from './read_only_user_role';

export async function createAPMUsers({
  kibana: { roleSuffix, hostname },
  elasticsearch,
}: {
  kibana: Kibana;
  elasticsearch: Elasticsearch;
}) {
  const KIBANA_READ_ROLE = `kibana_read_${roleSuffix}`;
  const KIBANA_POWER_ROLE = `kibana_power_${roleSuffix}`;
  const APM_USER_ROLE = 'apm_user';

  // roles definition
  const roles = [
    {
      roleName: KIBANA_READ_ROLE,
      role: readOnlyUserRole,
    },
    {
      roleName: KIBANA_POWER_ROLE,
      role: powerUserRole,
    },
  ];

  // create roles
  await Promise.all(
    roles.map(async (role) =>
      createRole({ elasticsearch, kibanaHostname: hostname, ...role })
    )
  );

  // users definition
  const users = [
    {
      username: 'apm_read_user',
      roles: [APM_USER_ROLE, KIBANA_READ_ROLE],
    },
    {
      username: 'apm_power_user',
      roles: [APM_USER_ROLE, KIBANA_POWER_ROLE],
    },
  ];

  // create users
  await Promise.all(
    users.map(async (user) =>
      createOrUpdateUser({ elasticsearch, kibanaHostname: hostname, user })
    )
  );
}

interface User {
  username: string;
  roles: string[];
  full_name?: string;
  email?: string;
  enabled?: boolean;
}

async function createOrUpdateUser({
  elasticsearch,
  kibanaHostname,
  user,
}: {
  elasticsearch: Elasticsearch;
  kibanaHostname: string;
  user: User;
}) {
  const existingUser = await getUser({
    elasticsearch,
    kibanaHostname,
    username: user.username,
  });
  if (!existingUser) {
    return createUser({ elasticsearch, kibanaHostname, newUser: user });
  }

  return updateUser({
    elasticsearch,
    kibanaHostname,
    existingUser,
    newUser: user,
  });
}

async function createUser({
  elasticsearch,
  kibanaHostname,
  newUser,
}: {
  elasticsearch: Elasticsearch;
  kibanaHostname: string;
  newUser: User;
}) {
  const user = await callKibana<User>({
    elasticsearch,
    kibanaHostname,
    options: {
      method: 'POST',
      url: `/internal/security/users/${newUser.username}`,
      data: {
        ...newUser,
        enabled: true,
        password: elasticsearch.password,
      },
    },
  });

  console.log(`User "${newUser.username}" was created`);
  return user;
}

async function updateUser({
  elasticsearch,
  kibanaHostname,
  existingUser,
  newUser,
}: {
  elasticsearch: Elasticsearch;
  kibanaHostname: string;
  existingUser: User;
  newUser: User;
}) {
  const { username } = newUser;
  const allRoles = union(existingUser.roles, newUser.roles);
  const hasAllRoles = difference(allRoles, existingUser.roles).length === 0;
  if (hasAllRoles) {
    console.log(
      `Skipping: User "${username}" already has neccesarry roles: "${newUser.roles}"`
    );
    return;
  }

  // assign role to user
  await callKibana({
    elasticsearch,
    kibanaHostname,
    options: {
      method: 'POST',
      url: `/internal/security/users/${username}`,
      data: { ...existingUser, roles: allRoles },
    },
  });

  console.log(`User "${username}" was updated`);
}

async function getUser({
  elasticsearch,
  kibanaHostname,
  username,
}: {
  elasticsearch: Elasticsearch;
  kibanaHostname: string;
  username: string;
}) {
  try {
    return await callKibana<User>({
      elasticsearch,
      kibanaHostname,
      options: {
        url: `/internal/security/users/${username}`,
      },
    });
  } catch (e) {
    // return empty if user doesn't exist
    if (isAxiosError(e) && e.response?.status === 404) {
      return null;
    }

    throw e;
  }
}
