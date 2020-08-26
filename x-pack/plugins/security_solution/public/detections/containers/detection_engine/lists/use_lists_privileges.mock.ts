/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UseListsPrivilegesReturn } from './use_lists_privileges';

export const getUseListsPrivilegesMock: () => jest.Mocked<UseListsPrivilegesReturn> = () => ({
  isAuthenticated: null,
  canManageIndex: null,
  canWriteIndex: null,
  loading: false,
});
