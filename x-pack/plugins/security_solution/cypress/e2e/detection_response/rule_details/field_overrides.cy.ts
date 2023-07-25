/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAlertsAndRules } from '../../../tasks/common';
import { SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';
import { getNewOverrideRule, getSeveritiesOverride } from '../../../objects/rule';

import {
  ABOUT_DETAILS,
  DETAILS_DESCRIPTION,
  DETAILS_TITLE,
  RISK_SCORE_DETAILS,
  RISK_SCORE_OVERRIDE_DETAILS,
  RULE_NAME_HEADER,
  RULE_NAME_OVERRIDE_DETAILS,
  SEVERITY_DETAILS,
  TIMESTAMP_OVERRIDE_DETAILS,
} from '../../../screens/rule_details';

import {
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../../tasks/alerts_detection_rules';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { getDetails } from '../../../tasks/rule_details';
import { createRule } from '../../../tasks/api_calls/rules';

describe('Rule override fields', () => {
  const rule = getNewOverrideRule();

  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(rule);
    login();
    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    waitForRulesTableToBeLoaded();
  });

  it('Displays override options in rule details page', function () {
    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', 'High');
      getDetails(RISK_SCORE_DETAILS).should('have.text', rule.risk_score);
      getDetails(RISK_SCORE_OVERRIDE_DETAILS).should(
        'have.text',
        `${rule.risk_score_mapping?.[0].field}kibana.alert.risk_score`
      );
      getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', rule.rule_name_override);
      getDetails(TIMESTAMP_OVERRIDE_DETAILS).should('have.text', rule.timestamp_override);
      cy.contains(DETAILS_TITLE, 'Severity override')
        .invoke('index', DETAILS_TITLE) // get index relative to other titles, not all siblings
        .then((severityOverrideIndex) => {
          rule.severity_mapping?.forEach((severity, i) => {
            cy.get(DETAILS_DESCRIPTION)
              .eq(severityOverrideIndex + i)
              .should(
                'have.text',
                `${severity.field}:${severity.value}${getSeveritiesOverride()[i]}`
              );
          });
        });
    });
  });
});
