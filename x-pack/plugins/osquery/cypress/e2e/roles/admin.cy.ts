/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import { navigateTo } from '../../tasks/navigation';
import { checkResults, inputQuery, selectAllAgents, submitQuery } from '../../tasks/live_query';

// figure out how to convert this tests to serverless roles
describe.skip('Admin', { tags: [tag.ESS] }, () => {
  beforeEach(() => {
    cy.login();
    navigateTo('/app/osquery');
  });

  it('should be able to run live query with BASE All permissions', () => {
    cy.contains('New live query').click();
    selectAllAgents();
    inputQuery('select * from uptime;');
    submitQuery();
    checkResults();
  });
});
