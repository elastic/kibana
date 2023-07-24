/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';

import { createRule } from '../../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import {
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../../tasks/alerts_detection_rules';
import { SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';
import { getMachineLearningRule } from '../../../objects/rule';

import {
  ANOMALY_SCORE_DETAILS,
  DEFINITION_DETAILS,
  MACHINE_LEARNING_JOB_ID,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../screens/rule_details';

import { getDetails } from '../../../tasks/rule_details';
import { login, visitWithoutDateRange } from '../../../tasks/login';

// Only testing components in the rule details page unique to ML rules
describe('Machine learning', () => {
  const mlRule = getMachineLearningRule();

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(mlRule);
    login();
    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    waitForRulesTableToBeLoaded();
  });

  it('Shows anomaly details', () => {
    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${mlRule.name}`);

    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(ANOMALY_SCORE_DETAILS).should('have.text', mlRule.anomaly_threshold);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Machine Learning');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      const machineLearningJobsArray = isArray(mlRule.machine_learning_job_id)
        ? mlRule.machine_learning_job_id
        : [mlRule.machine_learning_job_id];
      // With the #1912 ML rule improvement changes we enable jobs on rule creation.
      // Though, in cypress jobs enabling does not work reliably and job can be started or stopped.
      // Thus, we disable next check till we fix the issue with enabling jobs in cypress.
      // Relevant ticket: https://github.com/elastic/security-team/issues/5389
      // cy.get(MACHINE_LEARNING_JOB_STATUS).should('have.text', 'StoppedStopped');
      cy.get(MACHINE_LEARNING_JOB_ID).should('have.text', machineLearningJobsArray.join(''));
    });
  });
});
