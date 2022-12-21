/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { userInfo } from 'os';

export const createSecuritySuperuser = async (
  esClient: Client,
  username: string = userInfo().username,
  password: string = 'changeme'
): Promise<{ username: string; password: string; created: boolean }> => {
  if (!username || !password) {
    throw new Error(`username and password require values.`);
  }

  const addedUser = await esClient.transport.request<Promise<{ created: boolean }>>({
    method: 'POST',
    path: `_security/user/${username}`,
    body: {
      password,
      roles: ['superuser', 'kibana_system'],
      full_name: username,
    },
  });

  return {
    created: addedUser.created,
    username,
    password,
  };
};
