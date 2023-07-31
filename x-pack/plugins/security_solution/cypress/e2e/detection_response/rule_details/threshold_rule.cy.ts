/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../../tasks/alerts_detection_rules';
import { getIndexPatterns, getNewThresholdRule } from '../../../objects/rule';

import {
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  THRESHOLD_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../screens/rule_details';

import { getDetails } from '../../../tasks/rule_details';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../tasks/login';

describe('Detection rules, threshold', () => {
  const rule = getNewThresholdRule();

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

  it('Creates and enables a new threshold rule', () => {
    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should('have.text', getIndexPatterns().join(''));
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.query);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Threshold');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      getDetails(THRESHOLD_DETAILS).should(
        'have.text',
        `Results aggregated by ${rule.threshold.field} >= ${rule.threshold.value}`
      );
    });
  });
});
