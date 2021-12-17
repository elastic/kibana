/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_AGENT_POLICIES, navigateTo } from '../tasks/navigation';
import { addIntegration } from '../tasks/integrations';
import { checkResults, inputQuery, selectAllAgents, submitQuery } from '../tasks/live_query';
import { login } from '../tasks/login';

describe('Add Integration', () => {
  const integration = 'Osquery Manager';

  before(() => {
    login();
  });

  it('should display Osquery integration in the Policies list once installed ', () => {
    addAndVerifyIntegration();
  });

  it.skip('should run live query', () => {
    navigateTo('/app/osquery/live_queries/new');
    cy.wait(1000);
    selectAllAgents();
    inputQuery();
    submitQuery();
    checkResults();
  });

  function addAndVerifyIntegration() {
    navigateTo(FLEET_AGENT_POLICIES);
    cy.contains('Default policy').click();
    cy.contains('Add integration').click();

    cy.contains(integration).click();
    addIntegration();
    cy.contains('osquery_manager-');
  }
});
