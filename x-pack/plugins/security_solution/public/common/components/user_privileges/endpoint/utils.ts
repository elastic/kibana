/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEndpointAuthzInitialState } from '../../../../../common/endpoint/service/authz';
import type { EndpointPrivileges } from '../../../../../common/endpoint/types';

export const getEndpointPrivilegesInitialState = (): EndpointPrivileges => {
  return {
    loading: true,
    ...getEndpointAuthzInitialState(),
  };
};
