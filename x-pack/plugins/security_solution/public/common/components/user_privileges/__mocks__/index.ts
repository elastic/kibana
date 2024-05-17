/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEndpointPrivilegesInitialStateMock } from '../endpoint/mocks';
import type { UserPrivilegesState } from '../user_privileges_context';
import { initialUserPrivilegesState } from '../user_privileges_context';

export const getUserPrivilegesMockDefaultValue = () => {
  const mockedPrivileges: UserPrivilegesState = {
    ...initialUserPrivilegesState(),
    endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
  };

  return mockedPrivileges;
};

export const useUserPrivileges = jest.fn(getUserPrivilegesMockDefaultValue);
