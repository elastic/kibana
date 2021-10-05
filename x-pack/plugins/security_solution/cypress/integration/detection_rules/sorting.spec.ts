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
  RULE_AUTO_REFRESH_IDLE_MODAL,
  FOURTH_RULE,
  RULES_TABLE,
  pageSelector,
} from '../../screens/alerts_detection_rules';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsPanelToBeLoaded,
  waitForAlertsIndexToBeCreated,
} from '../../tasks/alerts';
import {
  activateRule,
  changeRowsPerPageTo,
  checkAllRulesIdleModal,
  checkAutoRefresh,
  dismissAllRulesIdleModal,
  goToPage,
  resetAllRulesIdleModalTimeout,
  sortByActivatedRules,
  waitForRulesTableToBeLoaded,
  waitForRuleToChangeStatus,
} from '../../tasks/alerts_detection_rules';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { DEFAULT_RULE_REFRESH_INTERVAL_VALUE } from '../../../common/constants';

import { ALERTS_URL } from '../../urls/navigation';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import {
  getExistingRule,
  getNewOverrideRule,
  getNewRule,
  getNewThresholdRule,
} from '../../objects/rule';

describe('Alerts detection rules', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRule(getNewRule(), '1');
    createCustomRule(getExistingRule(), '2');
    createCustomRule(getNewOverrideRule(), '3');
    createCustomRule(getNewThresholdRule(), '4');
  });

  it('Sorts by activated rules', () => {
    goToManageAlertsDetectionRules();
    waitForRulesTableToBeLoaded();

    cy.get(RULE_NAME)
      .eq(SECOND_RULE)
      .invoke('text')
      .then((secondInitialRuleName) => {
        activateRule(SECOND_RULE);
        waitForRuleToChangeStatus();
        cy.get(RULE_NAME)
          .eq(FOURTH_RULE)
          .invoke('text')
          .then((fourthInitialRuleName) => {
            activateRule(FOURTH_RULE);
            waitForRuleToChangeStatus();
            sortByActivatedRules();
            cy.get(RULE_NAME)
              .eq(FIRST_RULE)
              .invoke('text')
              .then((firstRuleName) => {
                cy.get(RULE_NAME)
                  .eq(SECOND_RULE)
                  .invoke('text')
                  .then((secondRuleName) => {
                    const expectedRulesNames = `${firstRuleName} ${secondRuleName}`;
                    cy.wrap(expectedRulesNames).should('include', secondInitialRuleName);
                    cy.wrap(expectedRulesNames).should('include', fourthInitialRuleName);
                  });
              });
            cy.get(RULE_SWITCH).eq(FIRST_RULE).should('have.attr', 'role', 'switch');
            cy.get(RULE_SWITCH).eq(SECOND_RULE).should('have.attr', 'role', 'switch');
          });
      });
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
        cy.get(RULES_TABLE)
          .find(RULE_NAME)
          .first()
          .invoke('text')
          .should((ruleNameSecondPage) => {
            expect(ruleNameFirstPage).not.to.eq(ruleNameSecondPage);
          });
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

    // mock 45 minutes passing to check that idle modal shows
    // and refreshing is paused
    checkAllRulesIdleModal('be.visible');
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'not.exist');

    // clicking on modal to continue, should resume refreshing
    dismissAllRulesIdleModal();
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'be.visible');

    // if mouse movement detected, idle modal should not
    // show after 45 min
    resetAllRulesIdleModalTimeout();
    cy.get(RULE_AUTO_REFRESH_IDLE_MODAL).should('not.exist');
  });
});
