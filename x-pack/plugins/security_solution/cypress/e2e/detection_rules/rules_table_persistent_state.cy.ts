/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana, resetRulesTableState } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { DASHBOARDS_URL, SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';
import { getNewRule } from '../../objects/rule';
import {
  expectNumberOfRules,
  expectToContainRule,
  filterBySearchTerm,
  goToRuleDetails,
} from '../../tasks/alerts_detection_rules';
import { RULE_SEARCH_FIELD } from '../../screens/alerts_detection_rules';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { goBackToRulesTable } from '../../tasks/rule_details';

function createRule(id: string, name: string, tags?: string[]): void {
  const rule = getNewRule();

  rule.name = name;
  rule.tags = tags;

  createCustomRule(rule, id);
}

describe('Persistent rules table state', () => {
  before(() => {
    cleanKibana();

    createRule('1', 'Test rule 1');
    createRule('2', 'Test rule 2', ['Custom']);

    login();
  });

  beforeEach(() => {
    resetRulesTableState();
    visit(SECURITY_DETECTIONS_RULES_URL); // Make sure state isn't persisted in the url
  });

  it('reloads the state from the url if the storage was cleared', () => {
    filterBySearchTerm('rule 1');

    cy.window().then((win) => {
      win.sessionStorage.clear();
    });
    cy.reload();

    cy.get(RULE_SEARCH_FIELD).should('have.value', 'rule 1');
    expectNumberOfRules(1);
    expectToContainRule('rule 1');
  });

  it('preserved after navigation from the rules details page', () => {
    filterBySearchTerm('rule 1');

    expectNumberOfRules(1);
    expectToContainRule('rule 1');

    goToRuleDetails();
    goBackToRulesTable();

    cy.get(RULE_SEARCH_FIELD).should('have.value', 'rule 1');
    expectNumberOfRules(1);
    expectToContainRule('rule 1');
  });

  it('preserved after navigation from another page', () => {
    filterBySearchTerm('rule 1');

    visit(DASHBOARDS_URL);
    visit(SECURITY_DETECTIONS_RULES_URL);

    cy.get(RULE_SEARCH_FIELD).should('have.value', 'rule 1');
    expectNumberOfRules(1);
    expectToContainRule('rule 1');
  });
});
