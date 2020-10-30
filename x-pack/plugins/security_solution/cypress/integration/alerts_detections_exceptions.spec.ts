/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { exception } from '../objects/exception';

import { RULE_STATUS } from '../screens/create_new_rule';
import { SERVER_SIDE_EVENT_COUNT } from '../screens/timeline';

import {
  addExceptionFromFirstAlert,
  goToClosedAlerts,
  goToManageAlertsDetectionRules,
  goToOpenedAlerts,
  waitForAlertsIndexToBeCreated,
} from '../tasks/alerts';
import { goToRuleDetails } from '../tasks/alerts_detection_rules';
import { waitForAlertsToPopulate } from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  activatesRule,
  addsException,
  addsExceptionFromRuleSettings,
  deactivatesRule,
  goToAlertsTab,
  goToExceptionsTab,
  removeException,
  waitForTheRuleToBeExecuted,
} from '../tasks/rule_details';
import { refreshPage } from '../tasks/security_header';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Exceptions', () => {
  beforeEach(() => {
    esArchiverLoad('rule_for_exceptions');
  });

  afterEach(() => {
    esArchiverUnload('rule_for_exceptions');
    esArchiverUnload('auditbeat_for_exceptions');
  });

  it('Creates an exception from rule details and deletes the exception', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    activatesRule();
    esArchiverLoad('auditbeat_for_exceptions');
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();
    refreshPage();
    deactivatesRule();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfInitialAlertsText) => {
        cy.wrap(parseInt(numberOfInitialAlertsText, 10)).should('be.above', 0);

        goToExceptionsTab();
        addsExceptionFromRuleSettings(exception);
        activatesRule();
        esArchiverLoad('auditbeat_for_exceptions');
        waitForTheRuleToBeExecuted();
        refreshPage();
        goToAlertsTab();

        cy.get(SERVER_SIDE_EVENT_COUNT)
          .invoke('text')
          .then((numberOfAlertsAfterCreatingExceptionText) => {
            cy.wrap(parseInt(numberOfAlertsAfterCreatingExceptionText, 10)).should(
              'be.below',
              parseInt(numberOfInitialAlertsText, 10)
            );

            goToClosedAlerts();
            refreshPage();

            cy.get(SERVER_SIDE_EVENT_COUNT)
              .invoke('text')
              .then((numberOfClosedAlertsAfterCreatingExceptionText) => {
                cy.wrap(parseInt(numberOfClosedAlertsAfterCreatingExceptionText, 10)).should(
                  'be.above',
                  0
                );

                goToOpenedAlerts();
                refreshPage();

                cy.get(SERVER_SIDE_EVENT_COUNT)
                  .invoke('text')
                  .then((numberOfOpenedAlertsAfterCreatingExceptionText) => {
                    cy.wrap(parseInt(numberOfOpenedAlertsAfterCreatingExceptionText, 10)).should(
                      'be.below',
                      parseInt(numberOfInitialAlertsText, 10)
                    );

                    goToExceptionsTab();
                    removeException();
                    esArchiverLoad('auditbeat_for_exceptions');
                    waitForTheRuleToBeExecuted();
                    goToAlertsTab();
                    goToOpenedAlerts();
                    refreshPage();

                    cy.get(SERVER_SIDE_EVENT_COUNT)
                      .invoke('text')
                      .then((numberOfAlertsAfterDeletingExceptionText) => {
                        cy.wrap(parseInt(numberOfAlertsAfterDeletingExceptionText, 10)).should(
                          'be.above',
                          parseInt(numberOfOpenedAlertsAfterCreatingExceptionText, 10)
                        );
                      });
                  });
              });
          });
      });
  });

  it('Creates an exception from an alert and deletes the exception', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    goToRuleDetails();

    cy.get(RULE_STATUS).should('have.text', '—');

    activatesRule();
    esArchiverLoad('auditbeat_for_exceptions');
    waitForTheRuleToBeExecuted();
    refreshPage();
    waitForAlertsToPopulate();
    deactivatesRule();

    cy.get(SERVER_SIDE_EVENT_COUNT)
      .invoke('text')
      .then((numberOfInitialAlertsText) => {
        cy.wrap(parseInt(numberOfInitialAlertsText, 10)).should('be.above', 0);

        addExceptionFromFirstAlert();
        addsException(exception);
        activatesRule();
        esArchiverLoad('auditbeat_for_exceptions');

        cy.get(SERVER_SIDE_EVENT_COUNT)
          .invoke('text')
          .then((numberOfAlertsAfterCreatingExceptionText) => {
            cy.wrap(parseInt(numberOfAlertsAfterCreatingExceptionText, 10)).should(
              'be.below',
              parseInt(numberOfInitialAlertsText, 10)
            );

            goToClosedAlerts();
            refreshPage();

            cy.get(SERVER_SIDE_EVENT_COUNT)
              .invoke('text')
              .then((numberOfClosedAlertsAfterCreatingExceptionText) => {
                cy.wrap(parseInt(numberOfClosedAlertsAfterCreatingExceptionText, 10)).should(
                  'be.above',
                  0
                );

                goToOpenedAlerts();
                refreshPage();

                cy.get(SERVER_SIDE_EVENT_COUNT)
                  .invoke('text')
                  .then((numberOfOpenedAlertsAfterCreatingExceptionText) => {
                    cy.wrap(parseInt(numberOfOpenedAlertsAfterCreatingExceptionText, 10)).should(
                      'be.below',
                      parseInt(numberOfInitialAlertsText, 10)
                    );

                    goToExceptionsTab();
                    removeException();
                    esArchiverLoad('auditbeat_for_exceptions');
                    goToAlertsTab();
                    waitForTheRuleToBeExecuted();
                    refreshPage();
                    waitForAlertsToPopulate();

                    cy.get(SERVER_SIDE_EVENT_COUNT)
                      .invoke('text')
                      .then((numberOfAlertsAfterDeletingExceptionText) => {
                        cy.wrap(parseInt(numberOfAlertsAfterDeletingExceptionText, 10)).should(
                          'be.above',
                          parseInt(numberOfOpenedAlertsAfterCreatingExceptionText, 10)
                        );
                      });
                  });
              });
          });
      });
  });
});
