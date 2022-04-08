/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semver from 'semver';
import { HOST_NAME, REASON, RISK_SCORE, RULE_NAME, SEVERITY } from '../../../screens/alerts';
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
  THRESHOLD_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../screens/rule_details';

import { getDetails } from '../../../tasks/rule_details';
import { expandFirstAlert } from '../../../tasks/alerts';
import { waitForPageToBeLoaded } from '../../../tasks/common';
import {
  goToTheRuleDetailsOf,
  waitForRulesTableToBeLoaded,
} from '../../../tasks/alerts_detection_rules';
import { login, visit } from '../../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import {
  OVERVIEW_HOST_NAME,
  OVERVIEW_RISK_SCORE,
  OVERVIEW_RULE,
  OVERVIEW_SEVERITY,
  OVERVIEW_STATUS,
  OVERVIEW_THRESHOLD_COUNT,
  OVERVIEW_THRESHOLD_VALUE,
  SUMMARY_VIEW,
} from '../../../screens/alerts_details';

const EXPECTED_NUMBER_OF_ALERTS = '1';

const alert = {
  rule: 'Threshold rule',
  severity: 'Medium',
  riskScore: '17',
  reason: 'event created medium alert Threshold rule.',
  hostName: 'security-solution.local',
  thresholdCount: '2',
};

const rule = {
  customQuery: '*:*',
  name: 'Threshold rule',
  description: 'Threshold rule for testing upgrade',
  index: ['auditbeat-threshold*'],
  severity: 'Medium',
  riskScore: '17',
  timelineTemplate: 'none',
  runsEvery: '24h',
  lookBack: '49976h',
  timeline: 'None',
  thresholdField: 'host.name',
  threholdValue: '1',
};

describe('After an upgrade, the threshold rule', () => {
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
    cy.get(RULE_NAME_HEADER).should('contain', rule.name);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', rule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', rule.severity);
      getDetails(RISK_SCORE_DETAILS).should('have.text', rule.riskScore);
    });
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should('have.text', rule.index.join(''));
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.customQuery);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Threshold');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', rule.timeline);
      getDetails(THRESHOLD_DETAILS).should(
        'have.text',
        `Results aggregated by ${rule.thresholdField} >= ${rule.threholdValue}`
      );
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should('have.text', rule.runsEvery);
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should('have.text', rule.lookBack);
    });
  });

  it('Displays the alert details in the TGrid', () => {
    let expectedReason;
    if (semver.gt(Cypress.env('ORIGINAL_VERSION'), '7.15.0')) {
      expectedReason = alert.reason;
    } else {
      expectedReason = '-';
    }
    cy.get(RULE_NAME).should('have.text', alert.rule);
    cy.get(SEVERITY).should('have.text', alert.severity);
    cy.get(RISK_SCORE).should('have.text', alert.riskScore);
    cy.get(REASON).should('have.text', expectedReason);
    cy.get(HOST_NAME).should('have.text', alert.hostName);
  });

  it('Displays the Overview alert details in the alert flyout', () => {
    expandFirstAlert();

    cy.get(OVERVIEW_STATUS).should('have.text', 'open');
    cy.get(OVERVIEW_RULE).should('have.text', alert.rule);
    cy.get(OVERVIEW_SEVERITY).contains(alert.severity, { matchCase: false });
    cy.get(OVERVIEW_RISK_SCORE).should('have.text', alert.riskScore);
    cy.get(OVERVIEW_HOST_NAME).should('have.text', alert.hostName);
    cy.get(OVERVIEW_THRESHOLD_COUNT).should('have.text', alert.thresholdCount);
    cy.get(OVERVIEW_THRESHOLD_VALUE).should('have.text', alert.hostName);
    cy.get(SUMMARY_VIEW).should('contain', `${rule.thresholdField} [threshold]`);
  });
});
