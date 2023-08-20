/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import { checkResults, submitQuery } from '../../tasks/live_query';
import { loadRule, cleanupRule } from '../../tasks/api_fixtures';

describe('Alert Test', { tags: [tag.ESS] }, () => {
  let ruleId: string;

  before(() => {
    loadRule().then((data) => {
      ruleId = data.id;
    });
  });

  describe('alert_test role', () => {
    beforeEach(() => {
      login(ROLE.alert_test);
    });

    it('should not be able to run live query', () => {
      navigateTo('/app/osquery');
      preparePack(packName);
      findAndClickButton('Edit');
      cy.contains(`Edit ${packName}`);
      findFormFieldByRowsLabelAndType(
        'Scheduled agent policies (optional)',
        `${DEFAULT_POLICY} {downArrow}{enter}`
      );
      findAndClickButton('Update pack');
      closeModalIfVisible();
      cy.contains(`Successfully updated "${packName}" pack`);
      closeToastIfVisible();

      cy.visit('/app/security/rules');
      cy.contains(ruleName).click();
      cy.wait(2000);
      cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
      cy.getBySel('ruleSwitch').click();
      cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'false');
      cy.getBySel('ruleSwitch').click();
      cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
      cy.getBySel('expand-event').first().click();
      cy.getBySel('take-action-dropdown-btn').click();
      cy.getBySel('osquery-action-item').click();

      cy.contains('Run Osquery');
      cy.contains('Permission denied');
    });
  });

  describe('t1_analyst role', () => {
    beforeEach(() => {
      cy.login('t1_analyst');

      cy.visit(`/app/security/rules/id/${ruleId}/alerts`);
      cy.getBySel('expand-event').first().click();

      cy.wait(500);
      cy.getBySel('securitySolutionDocumentDetailsFlyoutInvestigationGuideButton').click();
      cy.contains('Get processes').click();
    });

    after(() => {
      cleanupRule(ruleId);
    });

    it('should be able to run rule investigation guide query', () => {
      submitQuery();
      checkResults();
    });

    it('should not be able to run custom query', () => {
      cy.intercept('POST', '/api/osquery/live_queries', (req) => {
        req.body.query = 'select * from processes limit 10';
      });
      submitQuery();
      cy.contains('Forbidden');
    });
  });
});
