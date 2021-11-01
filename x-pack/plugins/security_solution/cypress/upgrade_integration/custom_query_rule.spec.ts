/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_DETAILS_CELLS, SERVER_SIDE_EVENT_COUNT } from '../screens/alerts_detection_rules';
import {
  ADDITIONAL_LOOK_BACK_DETAILS,
  ABOUT_DETAILS,
  ABOUT_RULE_DESCRIPTION,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  getDetails,
  INDEX_PATTERNS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../screens/rule_details';

import { waitForPageToBeLoaded } from '../tasks/common';
import { waitForRulesTableToBeLoaded, goToRuleDetails } from '../tasks/alerts_detection_rules';
import { loginAndWaitForPage } from '../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../urls/navigation';

const EXPECTED_NUMBER_OF_ALERTS = '1';

const alert = {
  rule: 'Custom query rule for upgrade',
  severity: 'low',
  riskScore: '7',
  reason:
    'file event with process test, file The file to test, by Security Solution on security-solution.local created low alert Custom query rule for upgrade.',
  hostName: 'security-solution.local',
  username: 'test',
  processName: 'The file to test',
  fileName: 'The file to test',
  sourceIp: '127.0.0.1',
  destinationIp: '127.0.0.2',
};

const rule = {
  customQuery: '*:*',
  name: 'Custom query rule for upgrade',
  description: 'My description',
  index: ['auditbeat-*'],
  severity: 'Low',
  riskScore: '7',
  timelineTemplate: 'none',
  runsEvery: '10s',
  lookBack: '179999990s',
  timeline: 'None',
};

describe('After an upgrade, the custom query rule', () => {
  before(() => {
    loginAndWaitForPage(DETECTIONS_RULE_MANAGEMENT_URL);
    waitForRulesTableToBeLoaded();
    goToRuleDetails();
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

  it('Displays the alert details', () => {
    cy.get(ALERT_DETAILS_CELLS).first().focus();
    cy.get(ALERT_DETAILS_CELLS).first().type('{rightarrow}');
    cy.get(ALERT_DETAILS_CELLS)
      .contains(alert.rule)
      .then(($el) => {
        cy.wrap($el).type('{rightarrow}');
      });
    cy.get(ALERT_DETAILS_CELLS)
      .contains(alert.severity)
      .then(($el) => {
        cy.wrap($el).type('{rightarrow}');
      });
    cy.get(ALERT_DETAILS_CELLS)
      .contains(alert.riskScore)
      .then(($el) => {
        cy.wrap($el).type('{rightarrow}');
      });
    cy.get(ALERT_DETAILS_CELLS)
      .contains(alert.reason)
      .then(($el) => {
        cy.wrap($el).type('{rightarrow}');
      });
    cy.get(ALERT_DETAILS_CELLS)
      .contains(alert.hostName)
      .then(($el) => {
        cy.wrap($el).type('{rightarrow}');
      });
    cy.get(ALERT_DETAILS_CELLS)
      .contains(alert.username)
      .then(($el) => {
        cy.wrap($el).type('{rightarrow}');
      });
    cy.get(ALERT_DETAILS_CELLS)
      .contains(alert.processName)
      .then(($el) => {
        cy.wrap($el).type('{rightarrow}');
      });
    cy.get(ALERT_DETAILS_CELLS)
      .contains(alert.fileName)
      .then(($el) => {
        cy.wrap($el).type('{rightarrow}');
      });
    cy.get(ALERT_DETAILS_CELLS)
      .contains(alert.sourceIp)
      .then(($el) => {
        cy.wrap($el).type('{rightarrow}');
      });
    cy.get(ALERT_DETAILS_CELLS).contains(alert.destinationIp);
  });
});
