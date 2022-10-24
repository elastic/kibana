/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { login } from '../../tasks/login';
import {
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  submitQuery,
} from '../../tasks/live_query';
import { preparePack } from '../../tasks/packs';
import { closeModalIfVisible } from '../../tasks/integrations';
import { navigateTo } from '../../tasks/navigation';
import { LIVE_QUERY_EDITOR, RESULTS_TABLE, RESULTS_TABLE_BUTTON } from '../../screens/live_query';
import { ROLES } from '../../test';

describe('Alert Event Details', () => {
  const RULE_NAME = 'Test-rule';

  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'pack');
    runKbnArchiverScript(ArchiverMethod.LOAD, 'rule');
  });
  beforeEach(() => {
    login(ROLES.soc_manager);
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'pack');
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'rule');
  });

  it('should prepare packs and alert rules', () => {
    const PACK_NAME = 'testpack';
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
    cy.contains(RULE_NAME);
    cy.wait(2000);
    cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
    cy.getBySel('ruleSwitch').click();
    cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'false');
    cy.getBySel('ruleSwitch').click();
    cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
  });

  it('enables to add detection action with osquery', () => {
    cy.visit('/app/security/rules');
    cy.contains(RULE_NAME).click();
    cy.contains('Edit rule settings').click();
    cy.getBySel('edit-rule-actions-tab').wait(500).click();
    cy.contains('Perform no actions').get('select').select('On each rule execution');
    cy.contains('Response actions are run on each rule execution');
    cy.getBySel('.osquery-ResponseActionTypeSelectOption').click();
    cy.get(LIVE_QUERY_EDITOR);
    cy.contains('Save changes').click();
    cy.contains('Query is a required field');
    inputQuery('select * from uptime');
    cy.wait(1000); // wait for the validation to trigger - cypress is way faster than users ;)

    // getSavedQueriesDropdown().type(`users{downArrow}{enter}`);
    cy.contains('Save changes').click();
    cy.contains(`${RULE_NAME} was saved`).should('exist');
    cy.contains('Edit rule settings').click();
    cy.getBySel('edit-rule-actions-tab').wait(500).click();
    cy.contains('select * from uptime');
  });

  it('should be able to run live query and add to timeline (-depending on the previous test)', () => {
    const TIMELINE_NAME = 'Untitled timeline';
    cy.visit('/app/security/alerts');
    cy.getBySel('header-page-title').contains('Alerts').should('exist');
    cy.getBySel('expand-event')
      .first()
      .within(() => {
        cy.get(`[data-is-loading="true"]`).should('exist');
      });
    cy.getBySel('expand-event')
      .first()
      .within(() => {
        cy.get(`[data-is-loading="true"]`).should('not.exist');
      });
    cy.getBySel('timeline-context-menu-button').first().click({ force: true });
    cy.contains('Run Osquery');
    cy.getBySel('expand-event').first().click({ force: true });
    cy.getBySel('take-action-dropdown-btn').click();
    cy.getBySel('osquery-action-item').click();
    cy.contains('1 agent selected.');
    inputQuery('select * from uptime;');
    submitQuery();
    cy.contains('Results');
    cy.contains('Add to timeline investigation');
    cy.contains('Save for later').click();
    cy.contains('Save query');
    cy.get('.euiButtonEmpty--flushLeft').contains('Cancel').click();
    cy.getBySel('add-to-timeline').first().click();
    cy.getBySel('globalToastList').contains('Added');
    cy.getBySel(RESULTS_TABLE).within(() => {
      cy.getBySel(RESULTS_TABLE_BUTTON).should('not.exist');
    });
    cy.contains('Cancel').click();
    cy.contains(TIMELINE_NAME).click();
    cy.getBySel('draggableWrapperKeyboardHandler').contains('action_id: "');
    // timeline unsaved changes modal
    cy.visit('/app/osquery');
    closeModalIfVisible();
  });
  // TODO think on how to get these actions triggered faster (because now they are not triggered during the test).
  // it.skip('sees osquery results from last action', () => {
  //   cy.visit('/app/security/alerts');
  //   cy.getBySel('header-page-title').contains('Alerts').should('exist');
  //   cy.getBySel('expand-event').first().click({ force: true });
  //   cy.contains('Osquery Results').click();
  //   cy.getBySel('osquery-results').should('exist');
  //   cy.contains('select * from uptime');
  //   cy.getBySel('osqueryResultsTable').within(() => {
  //     checkResults();
  //   });
  // });
});
