/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_AGENT_POLICIES, navigateTo } from '../tasks/navigation';
import { addIntegration } from '../tasks/integrations';

import { loginWithRole } from '../tasks/login';
import { ROLES } from '../test';

describe('Add Integration', () => {
  const integration = 'Osquery Manager';
  beforeEach(() => {
    cy.visit('/');
    loginWithRole(ROLES.t1_analyst);
    cy.wait(5000);
  });

  it('should display Osquery integration in the Policies list once installed ', () => {
    navigateTo(FLEET_AGENT_POLICIES);
    cy.contains('Default Fleet Server policy').click();
    cy.contains('Add integration').click();
    cy.contains(integration).click();
    addIntegration();
    cy.contains('osquery_manager-');
  });
});
