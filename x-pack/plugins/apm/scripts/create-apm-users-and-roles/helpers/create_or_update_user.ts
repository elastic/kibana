/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { difference, union } from 'lodash';
import { Elasticsearch, Kibana } from '../create_apm_users_and_roles';
import { callKibana, isAxiosError } from './call_kibana';

interface User {
  username: string;
  roles: string[];
  full_name?: string;
  email?: string;
  enabled?: boolean;
}

export async function createOrUpdateUser({
  elasticsearch,
  kibana,
  user,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
  user: User;
}) {
  const existingUser = await getUser({
    elasticsearch,
    kibana,
    username: user.username,
  });
  if (!existingUser) {
    return createUser({ elasticsearch, kibana, newUser: user });
  }

  return updateUser({
    elasticsearch,
    kibana,
    existingUser,
    newUser: user,
  });
}

async function createUser({
  elasticsearch,
  kibana,
  newUser,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
  newUser: User;
}) {
  const user = await callKibana<User>({
    elasticsearch,
    kibana,
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
  kibana,
  existingUser,
  newUser,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
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
    kibana,
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
  kibana,
  username,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
  username: string;
}) {
  try {
    return await callKibana<User>({
      elasticsearch,
      kibana,
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
