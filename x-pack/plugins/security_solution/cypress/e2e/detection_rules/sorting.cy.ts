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
  RULES_MANAGEMENT_TABLE,
  RULES_ROW,
} from '../../screens/alerts_detection_rules';
import {
  enableRule,
  waitForRulesTableToBeLoaded,
  waitForRuleToUpdate,
} from '../../tasks/alerts_detection_rules';
import { login, visit } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import {
  getExistingRule,
  getNewOverrideRule,
  getNewRule,
  getNewThresholdRule,
} from '../../objects/rule';
import { goToTablePage, setRowsPerPageTo, sortByTableColumn } from '../../tasks/table_pagination';
import { TABLE_FIRST_PAGE, TABLE_SECOND_PAGE } from '../../screens/table_pagination';

describe('Alerts detection rules', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRule(getNewRule(), '1');
    createCustomRule(getExistingRule(), '2');
    createCustomRule(getNewOverrideRule(), '3');
    createCustomRule(getNewThresholdRule(), '4');
  });

  it('Sorts by enabled rules', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);
    waitForRulesTableToBeLoaded();

    enableRule(SECOND_RULE);
    waitForRuleToUpdate();
    enableRule(FOURTH_RULE);
    waitForRuleToUpdate();

    cy.get(RULE_SWITCH).eq(SECOND_RULE).should('have.attr', 'role', 'switch');
    cy.get(RULE_SWITCH).eq(FOURTH_RULE).should('have.attr', 'role', 'switch');

    sortByTableColumn('Enabled', 'desc');

    cy.get(RULE_SWITCH).eq(FIRST_RULE).should('have.attr', 'role', 'switch');
    cy.get(RULE_SWITCH).eq(SECOND_RULE).should('have.attr', 'role', 'switch');
  });

  it('Pagination updates page number and results', () => {
    createCustomRule({ ...getNewRule(), name: 'Test a rule' }, '5');
    createCustomRule({ ...getNewRule(), name: 'Not same as first rule' }, '6');

    visit(DETECTIONS_RULE_MANAGEMENT_URL);
    waitForRulesTableToBeLoaded();
    setRowsPerPageTo(5);

    cy.get(RULES_MANAGEMENT_TABLE).find(TABLE_FIRST_PAGE).should('have.attr', 'aria-current');

    cy.get(RULES_MANAGEMENT_TABLE)
      .find(RULE_NAME)
      .first()
      .invoke('text')
      .then((ruleNameFirstPage) => {
        goToTablePage(2);
        // Check that the rules table shows at least one row
        cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length.gte', 1);
        // Check that the rules table doesn't show the rule from the first page
        cy.get(RULES_MANAGEMENT_TABLE).should('not.contain', ruleNameFirstPage);
      });

    cy.get(RULES_MANAGEMENT_TABLE).find(TABLE_FIRST_PAGE).should('not.have.attr', 'aria-current');
    cy.get(RULES_MANAGEMENT_TABLE).find(TABLE_SECOND_PAGE).should('have.attr', 'aria-current');
  });
});
