/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../test';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { login } from '../../tasks/login';
import {
  checkResults,
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  submitQuery,
} from '../../tasks/live_query';
import { closeModalIfVisible } from '../../tasks/integrations';
import { navigateTo } from '../../tasks/navigation';

describe('Alert_Test', () => {
  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'pack');
    runKbnArchiverScript(ArchiverMethod.LOAD, 'rule');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'pack');
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'rule');
  });

  describe('alert_test role', () => {
    it('should not be able to run live query', () => {
      login(ROLES.alert_test);

      const PACK_NAME = 'testpack';
      const RULE_NAME = 'Test-rule';
      navigateTo('/app/osquery');
      cy.contains('Packs').click();
      cy.getBySel('pagination-button-next').click();
      cy.contains(PACK_NAME).click();
      findAndClickButton('Edit');
      cy.contains(`Edit ${PACK_NAME}`);
      findFormFieldByRowsLabelAndType(
        'Scheduled agent policies (optional)',
        'fleet server {downArrow}{enter}'
      );
      findAndClickButton('Update pack');
      closeModalIfVisible();
      cy.contains(`Successfully updated "${PACK_NAME}" pack`);
      cy.getBySel('toastCloseButton').click();

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

      cy.contains('Run Osquery');
      cy.contains('Permission denied');
    });
  });

  describe('t1_analyst role', () => {
    it('should be able to run rule investigation guide query', () => {
      login(ROLES.t1_analyst);

      navigateTo('/app/osquery');

      cy.visit('/app/security/alerts');
      cy.getBySel('expand-event').first().click();

      cy.wait(500);
      cy.contains('Get processes').click();
      submitQuery();
      checkResults();
    });

    it('should not be able to run custom query', () => {
      login(ROLES.t1_analyst);

      navigateTo('/app/osquery');

      cy.visit('/app/security/alerts');
      cy.getBySel('expand-event').first().click();

      cy.wait(500);
      cy.contains('Get processes').click();

      cy.intercept('POST', '/api/osquery/live_queries', (req) => {
        req.body.query = 'select * from processes limit 10';
      });
      submitQuery();
      cy.contains('Forbidden');
    });
  });
});
