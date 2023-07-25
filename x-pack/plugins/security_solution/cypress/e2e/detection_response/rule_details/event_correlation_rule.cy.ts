/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';
import { getEqlRule, getIndexPatterns } from '../../../objects/rule';
import {
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../screens/rule_details';
import { createRule } from '../../../tasks/api_calls/rules';
import { getDetails } from '../../../tasks/rule_details';
import {
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../../tasks/alerts_detection_rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../tasks/login';

describe('EQL rules', () => {
  const rule = getEqlRule();

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(rule);
    login();
    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    waitForRulesTableToBeLoaded();
  });

  it('Displays EQL details', function () {
    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);

    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should('have.text', getIndexPatterns().join(''));
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.query);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Event Correlation');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    });
  });
});
