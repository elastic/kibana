/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import constate from 'constate';

import type { UserProfileAPIClient } from '../account_management';
import type { UserAPIClient } from '../management';

export interface ApiClients {
  userProfiles: UserProfileAPIClient;
  users: UserAPIClient;
}

const [ApiClientsProvider, useApiClients] = constate(({ userProfiles, users }: ApiClients) => ({
  userProfiles,
  users,
}));

export { ApiClientsProvider, useApiClients };
