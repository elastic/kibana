/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointPrivileges, getEndpointPrivilegesInitialState } from '../use_endpoint_privileges';

export const getEndpointPrivilegesInitialStateMock = (
  overrides: Partial<EndpointPrivileges> = {}
): EndpointPrivileges => {
  // Get the initial state and set all permissions to `true` (enabled) for testing
  const endpointPrivilegesMock: EndpointPrivileges = {
    ...(
      Object.entries(getEndpointPrivilegesInitialState()) as Array<
        [keyof EndpointPrivileges, boolean]
      >
    ).reduce((mockPrivileges, [key, value]) => {
      mockPrivileges[key] = !value;

      return mockPrivileges;
    }, {} as EndpointPrivileges),
    ...overrides,
  };

  return endpointPrivilegesMock;
};
