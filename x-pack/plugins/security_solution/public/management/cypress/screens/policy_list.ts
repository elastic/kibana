/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepReadonly } from 'utility-types';
import type { EndpointManagementPageMap } from './page_reference';
import { getEndpointManagementPageMap } from './page_reference';
import { getNoPrivilegesPage } from './common';
import { visitEndpointList } from './endpoint_list';
import type { UserAuthzAccessLevel } from './types';

const pageById: DeepReadonly<EndpointManagementPageMap> = getEndpointManagementPageMap();

export const visitPolicyList = (): Cypress.Chainable => {
  return cy.visit(pageById.policyList);
};

export const ensurePolicyListPageAuthzAccess = (
  accessLevel: UserAuthzAccessLevel,
  visitPage: boolean = false
): Cypress.Chainable => {
  if (visitPage) {
    visitEndpointList();
  }

  if (accessLevel === 'none') {
    return getNoPrivilegesPage().should('exist');
  }

  // Read and All currently are the same
  return getNoPrivilegesPage().should('not.exist');
};
