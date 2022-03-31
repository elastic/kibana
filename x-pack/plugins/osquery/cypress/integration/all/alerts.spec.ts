/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { login } from '../../tasks/login';
import {
  checkResults,
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  submitQuery,
} from '../../tasks/live_query';
import { preparePack } from '../../tasks/packs';
import { closeModalIfVisible } from '../../tasks/integrations';
import { navigateTo } from '../../tasks/navigation';
import { RESULTS_TABLE, RESULTS_TABLE_BUTTON } from '../../screens/live_query';

describe('Alert Event Details', () => {
  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'pack');
    runKbnArchiverScript(ArchiverMethod.LOAD, 'rule');
  });
  beforeEach(() => {
    login();
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'pack');
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'rule');
  });

  it('should be able to run live query', () => {
    const PACK_NAME = 'testpack';
    const RULE_NAME = 'Test-rule';
    navigateTo('/app/osquery/packs');
    preparePack(PACK_NAME);
    findAndClickButton('Edit');
    cy.contains(`Edit ${PACK_NAME}`);
    findFormFieldByRowsLabelAndType(
      'Scheduled agent policies (optional)',
      'fleet server {downArrow}{enter}'
    );
    findAndClickButton('Update pack');
    closeModalIfVisible();
    cy.contains(PACK_NAME);
    cy.visit('/app/security/rules');
    cy.contains(RULE_NAME).click();
    cy.wait(2000);
    cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
    cy.getBySel('ruleSwitch').click();
    cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'false');
    cy.getBySel('ruleSwitch').click();
    cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
    cy.visit('/app/security/alerts');
    cy.getBySel('expand-event').first().click();
    cy.getBySel('take-action-dropdown-btn').click();
    cy.getBySel('osquery-action-item').click();
    inputQuery('select * from uptime;');
    submitQuery();
    checkResults();
    cy.getBySel(RESULTS_TABLE).within(() => {
      cy.getBySel(RESULTS_TABLE_BUTTON).should('not.exist');
    });
    cy.contains('Save for later').click();
    cy.contains('Save query');
    cy.contains(/^Save$/);
  });
});
