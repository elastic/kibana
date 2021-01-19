/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  FIRST_RULE,
  RULE_NAME,
  RULE_SWITCH,
  SECOND_RULE,
  RULE_AUTO_REFRESH_IDLE_MODAL,
  FOURTH_RULE,
} from '../../screens/alerts_detection_rules';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsPanelToBeLoaded,
  waitForAlertsIndexToBeCreated,
} from '../../tasks/alerts';
import {
  activateRule,
  checkAllRulesIdleModal,
  checkAutoRefresh,
  dismissAllRulesIdleModal,
  resetAllRulesIdleModalTimeout,
  sortByActivatedRules,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRuleToBeActivated,
} from '../../tasks/alerts_detection_rules';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { DEFAULT_RULE_REFRESH_INTERVAL_VALUE } from '../../../common/constants';

import { DETECTIONS_URL } from '../../urls/navigation';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { existingRule, newOverrideRule, newRule, newThresholdRule } from '../../objects/rule';

describe('Alerts detection rules', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRule(newRule, '1');
    createCustomRule(existingRule, '2');
    createCustomRule(newOverrideRule, '3');
    createCustomRule(newThresholdRule, '4');
  });

  after(() => {
    cy.clock().invoke('restore');
  });

  it('Sorts by activated rules', () => {
    goToManageAlertsDetectionRules();

    cy.get(RULE_NAME)
      .eq(SECOND_RULE)
      .invoke('text')
      .then((secondInitialRuleName) => {
        activateRule(SECOND_RULE);
        waitForRuleToBeActivated();
        cy.get(RULE_NAME)
          .eq(FOURTH_RULE)
          .invoke('text')
          .then((fourthInitialRuleName) => {
            activateRule(FOURTH_RULE);
            waitForRuleToBeActivated();
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

  // FIXME: UI hangs on loading
  it.skip('Auto refreshes rules', () => {
    cy.clock(Date.now());

    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();

    // mock 1 minute passing to make sure refresh
    // is conducted
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'be.visible');

    // mock 45 minutes passing to check that idle modal shows
    // and refreshing is paused
    checkAllRulesIdleModal('be.visible');
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'not.be.visible');

    // clicking on modal to continue, should resume refreshing
    dismissAllRulesIdleModal();
    checkAutoRefresh(DEFAULT_RULE_REFRESH_INTERVAL_VALUE, 'be.visible');

    // if mouse movement detected, idle modal should not
    // show after 45 min
    resetAllRulesIdleModalTimeout();
    cy.get(RULE_AUTO_REFRESH_IDLE_MODAL).should('not.exist');

    cy.clock().invoke('restore');
  });
});
