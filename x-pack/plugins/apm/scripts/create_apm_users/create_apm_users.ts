/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortError, callKibana } from './helpers/call_kibana';
import { createOrUpdateUser } from './helpers/create_or_update_user';

export interface Elasticsearch {
  username: string;
  password: string;
}

export interface Kibana {
  hostname: string;
}

export async function createApmUsers({
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

  // user definitions
  const users = [
    { username: 'viewer_user', roles: ['viewer'] },
    { username: 'editor_user', roles: ['editor'] },
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
