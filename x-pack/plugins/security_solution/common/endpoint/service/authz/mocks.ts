/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAuthz } from '../../types/authz';
import { getEndpointAuthzInitialState } from './authz';

export const getEndpointAuthzInitialStateMock = (
  overrides: Partial<EndpointAuthz> = {}
): EndpointAuthz => {
  const authz: EndpointAuthz = {
    ...(
      Object.entries(getEndpointAuthzInitialState()) as Array<[keyof EndpointAuthz, boolean]>
    ).reduce((mockPrivileges, [key, value]) => {
      // Invert the initial values (from `false` to `true`) so that everything is authorized
      mockPrivileges[key] = !value;

      return mockPrivileges;
    }, {} as EndpointAuthz),
    // this one is currently treated special in that everyone can un-isolate
    canUnIsolateHost: true,
    ...overrides,
  };

  return authz;
};
