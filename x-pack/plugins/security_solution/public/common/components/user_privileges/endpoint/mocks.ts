/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointPrivileges } from '../../../../../common/endpoint/types';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';

export const getEndpointPrivilegesInitialStateMock = ({
  loading = false,
  ...overrides
}: Partial<EndpointPrivileges> = {}): EndpointPrivileges => {
  const endpointPrivilegesMock: EndpointPrivileges = {
    ...getEndpointAuthzInitialStateMock(overrides),
    loading,
  };

  return endpointPrivilegesMock;
};
