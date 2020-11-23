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
  RULE_AUTO_REFRESH_IDLE_MODAL,
} from '../screens/alerts_detection_rules';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsPanelToBeLoaded,
  waitForAlertsIndexToBeCreated,
} from '../tasks/alerts';
import {
  activateRule,
  checkAllRulesIdleModal,
  checkAutoRefresh,
  dismissAllRulesIdleModal,
  resetAllRulesIdleModalTimeout,
  sortByActivatedRules,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRuleToBeActivated,
} from '../tasks/alerts_detection_rules';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { removeSignalsIndex } from '../tasks/common';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { DEFAULT_RULE_REFRESH_INTERVAL_VALUE } from '../../common/constants';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Alerts detection rules', () => {
  before(() => {
    esArchiverLoad('prebuilt_rules_loaded');
  });

  after(() => {
    esArchiverUnload('prebuilt_rules_loaded');
    removeSignalsIndex();
    cy.clock().invoke('restore');
  });

  it('Sorts by activated rules', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
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

  it('Auto refreshes rules', () => {
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
