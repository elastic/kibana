/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAndEnrollEndpointHostResponse } from '../../../../scripts/endpoint/common/endpoint_host_services';

// only used in "real" endpoint tests not in mocked ones
export const createEndpointHost = (
  agentPolicyId: string,
  timeout?: number
): Cypress.Chainable<CreateAndEnrollEndpointHostResponse> => {
  return cy.task(
    'createEndpointHost',
    {
      agentPolicyId,
    },
    { timeout: timeout ?? 30 * 60 * 1000 }
  );
};
