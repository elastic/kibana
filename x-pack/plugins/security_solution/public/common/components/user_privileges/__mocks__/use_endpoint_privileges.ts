/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointPrivileges } from '../use_endpoint_privileges';

export const useEndpointPrivileges = jest.fn(() => {
  const endpointPrivilegesMock: EndpointPrivileges = {
    loading: false,
    canAccessFleet: true,
    canAccessEndpointManagement: true,
  };
  return endpointPrivilegesMock;
});
