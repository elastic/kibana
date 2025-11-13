/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum RoleBasedUsername {
  noAccessUser = 'no_access_user',
  viewerUser = 'viewer',
  editorUser = 'editor',
}

export const USER_TEST_PASSWORD = 'changeme';

export const Users: Record<RoleBasedUsername, { builtInRoleNames?: string[] }> = {
  [RoleBasedUsername.noAccessUser]: {},
  [RoleBasedUsername.viewerUser]: {
    builtInRoleNames: ['viewer'],
  },
  [RoleBasedUsername.editorUser]: {
    builtInRoleNames: ['editor'],
  },
};
