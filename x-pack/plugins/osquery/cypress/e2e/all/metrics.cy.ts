/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { ROLE, login } from '../../tasks/login';
import { checkResults, inputQuery, submitQuery } from '../../tasks/live_query';
import { loadSavedQuery, cleanupSavedQuery } from '../../tasks/api_fixtures';

describe('ALL - Inventory', () => {
  let savedQueryName: string;
  let savedQueryId: string;

  before(() => {
    loadSavedQuery().then((data) => {
      savedQueryId = data.id;
      savedQueryName = data.attributes.id;
    });
  });

  beforeEach(() => {
    login(ROLE.soc_manager);
    navigateTo('/app/osquery');
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
  });

  it('should be able to run the query', () => {
    cy.getBySel('toggleNavButton').click();
    cy.contains('Infrastructure').click();

    cy.getBySel('nodeContainer').first().click();
    cy.contains('Osquery').click();
    inputQuery('select * from uptime;');

    submitQuery();
    checkResults();
  });

  it('should be able to run the previously saved query', () => {
    cy.getBySel('toggleNavButton').click();
    cy.getBySel('collapsibleNavAppLink').contains('Infrastructure').click();

    cy.wait(500);
    cy.getBySel('nodeContainer').first().click();
    cy.contains('Osquery').click();

    cy.getBySel('comboBoxInput').first().click();
    cy.wait(500);
    cy.getBySel('comboBoxInput').first().type(`${savedQueryName}{downArrow}{enter}`);

    submitQuery();
    checkResults();
  });
});
