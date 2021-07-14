/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { RULES_MONIROTING_TABLE, RULE_NAME } from '../../screens/alerts_detection_rules';
import { goToManageAlertsDetectionRules, waitForAlertsIndexToBeCreated } from '../../tasks/alerts';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana, reload } from '../../tasks/common';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';

describe('Rules talbes links', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    goToManageAlertsDetectionRules();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(getNewRule(), 'rule1');

    reload();
  });

  it('should render correct link for rule name - rules', () => {
    cy.get(RULE_NAME).first().click();
    cy.url().should('contain', 'rules/id/');
  });

  it('should render correct link for rule name - rule monitoring', () => {
    cy.get(RULES_MONIROTING_TABLE).first().click();
    cy.get(RULE_NAME).first().click();
    cy.url().should('contain', 'rules/id/');
  });
});
