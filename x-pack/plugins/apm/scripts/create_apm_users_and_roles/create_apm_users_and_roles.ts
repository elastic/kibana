/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortError, callKibana } from './helpers/call_kibana';
import { createRole } from './helpers/create_role';
import { powerUserRole } from './roles/power_user_role';
import { readOnlyUserRole } from './roles/read_only_user_role';
import { createOrUpdateUser } from './helpers/create_or_update_user';

export interface Elasticsearch {
  username: string;
  password: string;
}

export interface Kibana {
  roleSuffix: string;
  hostname: string;
}

export async function createApmAndObsUsersAndRoles({
  kibana,
  elasticsearch,
}: {
  kibana: Kibana;
  elasticsearch: Elasticsearch;
}) {
  const isCredentialsValid = await getIsCredentialsValid({
    elasticsearch,
    kibana,
  });
  if (!isCredentialsValid) {
    throw new AbortError('Invalid username/password');
  }

  const isSecurityEnabled = await getIsSecurityEnabled({
    elasticsearch,
    kibana,
  });
  if (!isSecurityEnabled) {
    throw new AbortError('Security must be enabled!');
  }

  const KIBANA_READ_ROLE = `kibana_read_${kibana.roleSuffix}`;
  const KIBANA_POWER_ROLE = `kibana_power_${kibana.roleSuffix}`;

  // roles definition
  const roles = [
    { roleName: KIBANA_READ_ROLE, role: readOnlyUserRole },
    { roleName: KIBANA_POWER_ROLE, role: powerUserRole },
  ];

  // create roles
  await Promise.all(
    roles.map(async (role) => createRole({ elasticsearch, kibana, ...role }))
  );

  // user definitions
  const users = [
    { username: 'apm_read_user', roles: [KIBANA_READ_ROLE] },
    { username: 'apm_power_user', roles: [KIBANA_POWER_ROLE] },
    { username: 'obs_read_user', roles: [KIBANA_READ_ROLE] },
    { username: 'obs_admin_user', roles: [KIBANA_POWER_ROLE] },
  ];

  // create users
  await Promise.all(
    users.map(async (user) =>
      createOrUpdateUser({ elasticsearch, kibana, user })
    )
  );

  return users;
}

async function getIsSecurityEnabled({
  elasticsearch,
  kibana,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
}) {
  try {
    await callKibana({
      elasticsearch,
      kibana,
      options: {
        url: `/internal/security/me`,
      },
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function getIsCredentialsValid({
  elasticsearch,
  kibana,
}: {
  elasticsearch: Elasticsearch;
  kibana: Kibana;
}) {
  try {
    await callKibana({
      elasticsearch,
      kibana,
      options: {
        validateStatus: (status) => status >= 200 && status < 400,
        url: `/`,
      },
    });
    return true;
  } catch (err) {
    return false;
  }
}
