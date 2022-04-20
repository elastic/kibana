/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semver from 'semver';
import {
  DESTINATION_IP,
  HOST_NAME,
  PROCESS_NAME_COLUMN,
  PROCESS_NAME,
  REASON,
  RISK_SCORE,
  RULE_NAME,
  SEVERITY,
  SOURCE_IP,
  USER_NAME,
} from '../../../screens/alerts';
import { SERVER_SIDE_EVENT_COUNT } from '../../../screens/alerts_detection_rules';
import {
  ADDITIONAL_LOOK_BACK_DETAILS,
  ABOUT_DETAILS,
  ABOUT_RULE_DESCRIPTION,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../screens/rule_details';

import { getDetails } from '../../../tasks/rule_details';
import { waitForPageToBeLoaded } from '../../../tasks/common';
import {
  waitForRulesTableToBeLoaded,
  goToTheRuleDetailsOf,
} from '../../../tasks/alerts_detection_rules';
import { login, visit } from '../../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';

const EXPECTED_NUMBER_OF_ALERTS = '1';

const alert = {
  rule: 'Custom query rule for upgrade',
  severity: 'low',
  riskScore: '7',
  reason:
    'file event with process test, file The file to test, by Security Solution on security-solution.local created low alert Custom query rule for upgrade.',
  hostName: 'security-solution.local',
  username: 'Security Solution',
  processName: 'test',
  fileName: 'The file to test',
  sourceIp: '127.0.0.1',
  destinationIp: '127.0.0.2',
};

const rule = {
  customQuery: '*:*',
  name: 'Custom query rule for upgrade',
  description: 'My description',
  index: ['auditbeat-custom*'],
  severity: 'Low',
  riskScore: '7',
  timelineTemplate: 'none',
  runsEvery: '24h',
  lookBack: '49976h',
  timeline: 'None',
};

describe('After an upgrade, the custom query rule', () => {
  before(() => {
    login();
    visit(DETECTIONS_RULE_MANAGEMENT_URL);
    waitForRulesTableToBeLoaded();
    goToTheRuleDetailsOf(rule.name);
    waitForPageToBeLoaded();
  });

  it('Has the expected alerts number', () => {
    cy.get(SERVER_SIDE_EVENT_COUNT).contains(EXPECTED_NUMBER_OF_ALERTS);
  });

  it('Displays the rule details', () => {
    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', rule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', rule.severity);
      getDetails(RISK_SCORE_DETAILS).should('have.text', rule.riskScore);
    });
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should('have.text', rule.index.join(''));
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.customQuery);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', rule.timeline);
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should('have.text', rule.runsEvery);
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should('have.text', rule.lookBack);
    });
  });

  it('Displays the alert details at the tgrid', () => {
    let expectedReason;
    if (semver.gt(Cypress.env('ORIGINAL_VERSION'), '7.15.0')) {
      expectedReason = alert.reason;
    } else {
      expectedReason = '-';
    }
    cy.get(RULE_NAME).should('have.text', alert.rule);
    cy.get(SEVERITY).should('have.text', alert.severity);
    cy.get(RISK_SCORE).should('have.text', alert.riskScore);
    cy.get(REASON).should('have.text', expectedReason).type('{rightarrow}');
    cy.get(HOST_NAME).should('have.text', alert.hostName);
    cy.get(USER_NAME).should('have.text', alert.username);
    cy.get(PROCESS_NAME_COLUMN).eq(0).scrollIntoView();
    cy.get(PROCESS_NAME).should('have.text', alert.processName);
    cy.get(SOURCE_IP).should('have.text', alert.sourceIp);
    cy.get(DESTINATION_IP).should('have.text', alert.destinationIp);
  });
});
