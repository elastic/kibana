/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  FIFTH_RULE,
  FIRST_RULE,
  RULE_NAME,
  RULE_SWITCH,
  SECOND_RULE,
  SEVENTH_RULE,
} from '../screens/alert_detection_rules';

import {
  goToManageAlertDetectionRules,
  waitForAlertsPanelToBeLoaded,
  waitForAlertsIndexToBeCreated,
} from '../tasks/detections';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  activateRule,
  sortByActivatedRules,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRuleToBeActivated,
} from '../tasks/alert_detection_rules';

import { ALERTS_URL } from '../urls/navigation';

describe('Detection rules', () => {
  before(() => {
    esArchiverLoad('prebuilt_rules_loaded');
  });

  after(() => {
    esArchiverUnload('prebuilt_rules_loaded');
  });

  it('Sorts by activated rules', () => {
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    cy.get(RULE_NAME)
      .eq(FIFTH_RULE)
      .invoke('text')
      .then((fifthRuleName) => {
        activateRule(FIFTH_RULE);
        waitForRuleToBeActivated();
        cy.get(RULE_NAME)
          .eq(SEVENTH_RULE)
          .invoke('text')
          .then((seventhRuleName) => {
            activateRule(SEVENTH_RULE);
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
                    cy.wrap(expectedRulesNames).should('include', fifthRuleName);
                    cy.wrap(expectedRulesNames).should('include', seventhRuleName);
                  });
              });

            cy.get(RULE_SWITCH).eq(FIRST_RULE).should('have.attr', 'role', 'switch');
            cy.get(RULE_SWITCH).eq(SECOND_RULE).should('have.attr', 'role', 'switch');
          });
      });
  });
});
