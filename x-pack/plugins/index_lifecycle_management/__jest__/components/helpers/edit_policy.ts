/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { init as initHttpRequests } from './http_requests';

export type EditPolicySetup = ReturnType<typeof setup>;

export const setup = () => {
  const { httpRequestsMockHelpers, server } = initHttpRequests();

  const setupNodeListResponse = (
    response: Record<string, any> = {
      nodesByAttributes: { 'attribute:true': ['node1'] },
      nodesByRoles: { data: ['node1'] },
    }
  ) => {
    httpRequestsMockHelpers.setNodesListResponse(response);
  };

  return {
    http: {
      setupNodeListResponse,
      httpRequestsMockHelpers,
      server,
    },
  };
};
