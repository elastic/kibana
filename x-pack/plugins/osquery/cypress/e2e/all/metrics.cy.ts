/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { login } from '../../tasks/login';
import { checkResults, inputQuery, submitQuery } from '../../tasks/live_query';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { ROLES } from '../../test';

describe('ALL - Inventory', () => {
  beforeEach(() => {
    login(ROLES.soc_manager);
    navigateTo('/app/osquery');
  });
  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
  });
  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
  });

  it('should be able to run the query', () => {
    cy.getBySel('toggleNavButton').click();
    cy.contains('Infrastructure').click();

    cy.wait(1000);

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
    cy.getBySel('comboBoxInput').first().type('saved{downArrow}{enter}');

    submitQuery();
    checkResults();
  });
});
