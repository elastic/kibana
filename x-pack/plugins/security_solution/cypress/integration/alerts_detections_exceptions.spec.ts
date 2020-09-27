/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newRule } from '../objects/rule';
import { NUMBER_OF_ALERTS } from '../screens/alerts';
import { RULES_TABLE, RULES_ROW } from '../screens/alerts_detection_rules';
import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/alerts';
import {
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
} from '../tasks/alerts_detection_rules';
import {
  fillDefineCustomRuleWithImportedQueryAndContinue,
  fillAboutRuleAndContinue,
  fillScheduleRuleAndContinue,
  createAndActivateRule,
  waitForTheRuleToBeExecuted,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { DETECTIONS_URL } from '../urls/navigation';

describe('Exceptions', () => {
  before(() => {
    esArchiverLoad('timeline');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Creates an exception from rule details', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    fillDefineCustomRuleWithImportedQueryAndContinue(newRule);
    fillAboutRuleAndContinue(newRule);
    fillScheduleRuleAndContinue(newRule);
    createAndActivateRule();
    filterByCustomRules();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });

    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    cy.wait(15000);

    cy.get('[data-test-subj="exceptionsTab"]').click();
    cy.get('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').click();
    cy.wait(10000);
    cy.get('[data-test-subj="fieldAutocompleteComboBox"] [data-test-subj="comboBoxInput"]').type(
      'host.name{enter}'
    );
    cy.get('[data-test-subj="operatorAutocompleteComboBox"]').type('is one of{enter}');
    cy.get(
      '[data-test-subj="valuesAutocompleteComboBox matchAnyComboxBox"] [data-test-subj="comboBoxInput"]'
    ).type('siem-kibana{enter}', { delay: 30 });
    cy.get(
      '[data-test-subj="valuesAutocompleteComboBox matchAnyComboxBox"] [data-test-subj="comboBoxInput"]'
    ).type('suricata-iowa{enter}', { delay: 30 });
    cy.get(
      '[data-test-subj="valuesAutocompleteComboBox matchAnyComboxBox"] [data-test-subj="comboBoxInput"]'
    ).type('siem-es{enter}', { delay: 30 });
    cy.get(
      '[data-test-subj="valuesAutocompleteComboBox matchAnyComboxBox"] [data-test-subj="comboBoxInput"]'
    ).type('jessie{enter}', { delay: 30 });
    cy.get(
      '[data-test-subj="valuesAutocompleteComboBox matchAnyComboxBox"] [data-test-subj="comboBoxInput"]'
    ).type('siem{enter}', { delay: 30 });
    cy.get('[data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"]').click({
      force: true,
    });
    cy.get('[data-test-subj="add-exception-confirm-button"]').click();

    esArchiverLoad('auditbeat');

    cy.get('[data-test-subj="alertsTab"]').click();
    cy.get('[data-test-subj="server-side-event-count"]').should('have.attr', 'title', '0');
    cy.get('[data-test-subj="closedAlerts"]').click();
    cy.get('[data-test-subj="server-side-event-count"]')
      .invoke('text')
      .then((numberOfAlertsText) => {
        cy.wrap(parseInt(numberOfAlertsText, 10)).should('be.above', 0);
      });
  });
  /* it('Creates an exception from an existing alert');
    it('Deletes an existing exception');*/
});
