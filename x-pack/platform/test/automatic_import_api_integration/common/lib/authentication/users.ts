/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noIntegrationsPrivileges, onlyActions as onlyActionsRole } from './roles';
import { User } from './types';

export const superUser: User = {
  username: 'superuser',
  password: 'superuser',
  roles: ['superuser'],
};

export const noIntegrationsUser: User = {
  username: 'no_integrations_user',
  password: 'no_integrations_user',
  roles: [noIntegrationsPrivileges.name],
};

export const onlyActions: User = {
  username: 'only_actions',
  password: 'only_actions',
  roles: [onlyActionsRole.name],
};

export const users = [superUser, noIntegrationsUser, onlyActions];
