/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { AbortError, callKibana } from './helpers/call_kibana';
import { createOrUpdateUser } from './helpers/create_or_update_user';
import { ObservabilityOnboardingUsername, users } from './authentication';
import { createCustomRole } from './helpers/create_custom_role';
export interface Elasticsearch {
  node: string;
  username: string;
  password: string;
}

export interface Kibana {
  hostname: string;
}

export async function createObservabilityOnboardingUsers({
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

  const observabilityOnboardingUsers = Object.values(
    ObservabilityOnboardingUsername
  );
  await asyncForEach(observabilityOnboardingUsers, async (username) => {
    const user = users[username];
    const { builtInRoleNames = [], customRoleNames = [] } = user;

    // create custom roles
    await Promise.all(
      customRoleNames.map(async (roleName) =>
        createCustomRole({ elasticsearch, kibana, roleName })
      )
    );

    // create user
    const roles = builtInRoleNames.concat(customRoleNames);
    await createOrUpdateUser({
      elasticsearch,
      kibana,
      user: { username, roles },
    });
  });

  return observabilityOnboardingUsers;
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
