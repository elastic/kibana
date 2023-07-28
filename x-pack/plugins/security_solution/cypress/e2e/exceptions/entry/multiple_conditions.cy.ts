/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAlertsAndRules } from '../../../tasks/common';
import { getNewRule } from '../../../objects/rule';

import { createRule } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  openExceptionFlyoutFromEmptyViewerPrompt,
  goToExceptionsTab,
} from '../../../tasks/rule_details';
import {
  addExceptionFlyoutItemName,
  addTwoAndedConditions,
  addTwoORedConditions,
  submitNewExceptionItem,
  validateExceptionItemAffectsTheCorrectRulesInRulePage,
  validateExceptionItemFirstAffectedRuleNameInRulePage,
} from '../../../tasks/exceptions';
import {
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
} from '../../../screens/exceptions';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
Cypress._.times(50, () => {
  describe(
    'Add multiple conditions and validate the generated exceptions',
    { testIsolation: false },
    () => {
      const newRule = getNewRule();

      before(() => {
        // Unload the exceptions incase there was a list created before
        cy.task('esArchiverUnload', 'exceptions');
        cy.task('esArchiverResetKibana');
      });
      beforeEach(() => {
        deleteAlertsAndRules();
        login();
        // At least create Rule with exceptions_list to be able to view created exceptions
        createRule({
          ...newRule,
          query: 'agent.name:*',
          index: ['exceptions*'],
          exceptions_list: [],
          rule_id: '2',
        });
        visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
        goToRuleDetails();
        goToExceptionsTab();
      });

      after(() => {
        // Unload the exceptions incase there was a list created before
        cy.task('esArchiverUnload', 'exceptions');
      });
      const exceptionName = 'My item name';

      it('Use multipe AND conditions and validate it generates one exception', () => {
        // open add exception modal
        openExceptionFlyoutFromEmptyViewerPrompt();

        // add exception item name
        addExceptionFlyoutItemName(exceptionName);

        // add  Two ANDed condition
        addTwoAndedConditions('agent.name', 'foo', '@timestamp', '123');

        submitNewExceptionItem();

        // Only one Exception should generated
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

        // Validate the exception is affecting the correct rule count and name
        validateExceptionItemAffectsTheCorrectRulesInRulePage(1);
        validateExceptionItemFirstAffectedRuleNameInRulePage(newRule.name);

        // validate the And operator is displayed correctly
        cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', exceptionName);
        cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should(
          'have.text',
          ' agent.nameIS fooAND @timestampIS 123'
        );
      });

      it('Use multipe OR conditions and validate it generates multiple exceptions', () => {
        // open add exception modal
        openExceptionFlyoutFromEmptyViewerPrompt();

        // add exception item name
        addExceptionFlyoutItemName(exceptionName);

        // exception item 1
        // add  Two ORed condition
        addTwoORedConditions('agent.name', 'foo', '@timestamp', '123');

        submitNewExceptionItem();

        // Two Exceptions should be generated
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 2);

        // validate the details of the first exception
        cy.get(EXCEPTION_CARD_ITEM_NAME).eq(0).should('have.text', exceptionName);
      });
    }
  );
});
