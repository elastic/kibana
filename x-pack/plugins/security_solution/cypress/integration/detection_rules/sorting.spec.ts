/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIRST_RULE,
  RULE_NAME,
  RULE_SWITCH,
  SECOND_RULE,
  FOURTH_RULE,
  RULES_TABLE,
  pageSelector,
  RULES_ROW,
} from '../../screens/alerts_detection_rules';

import { goToManageAlertsDetectionRules, waitForAlertsPanelToBeLoaded } from '../../tasks/alerts';
import {
  enableRule,
  changeRowsPerPageTo,
  checkAutoRefresh,
  goToPage,
  sortByEnabledRules,
  waitForRulesTableToBeLoaded,
  waitForRuleToChangeStatus,
} from '../../tasks/alerts_detection_rules';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import {
  getExistingRule,
  getNewOverrideRule,
  getNewRule,
  getNewThresholdRule,
} from '../../objects/rule';

const DEFAULT_RULE_REFRESH_INTERVAL_VALUE = 60000;

describe('Alerts detection rules', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    createCustomRule(getNewRule(), '1');
    createCustomRule(getExistingRule(), '2');
    createCustomRule(getNewOverrideRule(), '3');
    createCustomRule(getNewThresholdRule(), '4');
  });

  it('Sorts by enabled rules', () => {
    goToManageAlertsDetectionRules();
    waitForRulesTableToBeLoaded();

    enableRule(SECOND_RULE);
    waitForRuleToChangeStatus();
    enableRule(FOURTH_RULE);
    waitForRuleToChangeStatus();

    cy.get(RULE_SWITCH).eq(SECOND_RULE).should('have.attr', 'role', 'switch');
    cy.get(RULE_SWITCH).eq(FOURTH_RULE).should('have.attr', 'role', 'switch');

    sortByEnabledRules();

    cy.get(RULE_SWITCH).eq(FIRST_RULE).should('have.attr', 'role', 'switch');
    cy.get(RULE_SWITCH).eq(SECOND_RULE).should('have.attr', 'role', 'switch');
  });

  it('Pagination updates page number and results', () => {
    createCustomRule({ ...getNewRule(), name: 'Test a rule' }, '5');
    createCustomRule({ ...getNewRule(), name: 'Not same as first rule' }, '6');

    goToManageAlertsDetectionRules();
    waitForRulesTableToBeLoaded();
    changeRowsPerPageTo(5);

    const FIRST_PAGE_SELECTOR = pageSelector(1);
    const SECOND_PAGE_SELECTOR = pageSelector(2);

    cy.get(RULES_TABLE)
      .find(FIRST_PAGE_SELECTOR)
      .should('have.class', 'euiPaginationButton-isActive');

    cy.get(RULES_TABLE)
      .find(RULE_NAME)
      .first()
      .invoke('text')
      .then((ruleNameFirstPage) => {
        goToPage(2);
        // Check that the rules table shows at least one row
        cy.get(RULES_TABLE).find(RULES_ROW).should('have.length.gte', 1);
        // Check that the rules table doesn't show the rule from the first page
        cy.get(RULES_TABLE).should('not.contain', ruleNameFirstPage);
      });

    cy.get(RULES_TABLE)
      .find(FIRST_PAGE_SELECTOR)
      .should('not.have.class', 'euiPaginationButton-isActive');
    cy.get(RULES_TABLE)
      .find(SECOND_PAGE_SELECTOR)
      .should('have.class', 'euiPaginationButton-isActive');
  });

  it('Auto refreshes rules', () => {
    /**
     * Ran into the error: timer created with setInterval() but cleared with cancelAnimationFrame()
     * There are no cancelAnimationFrames in the codebase that are used to clear a setInterval so
     * explicitly set the below overrides. see https://docs.cypress.io/api/commands/clock#Function-names
     */

    cy.clock(Date.now(), ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']);

    goToManageAlertsDetectionRules();
    waitForRulesTableToBeLoaded();

    // mock 1 minute passing to make sure refresh
    // is conducted
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'be.visible');
  });
});
