/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedQueryRule } from '../../../objects/rule';

import {
  RULE_NAME_HEADER,
  SAVED_QUERY_NAME_DETAILS,
  SAVED_QUERY_DETAILS,
  SAVED_QUERY_FILTERS_DETAILS,
  DEFINE_RULE_PANEL_PROGRESS,
} from '../../../screens/rule_details';

import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { createSavedQuery, deleteSavedQueries } from '../../../tasks/api_calls/saved_queries';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import { login, visit } from '../../../tasks/login';
import { getDetails } from '../../../tasks/rule_details';
import { createRule } from '../../../tasks/api_calls/rules';
import { SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';

const savedQueryName = 'custom saved query';
const savedQueryQuery = 'process.name: test';
const savedQueryFilterKey = 'testAgent.value';

// Only testing components in the rule details page unique to saved query rules
describe('Saved_query rule', () => {
  const rule = getSavedQueryRule();

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deleteSavedQueries();
    createSavedQuery(savedQueryName, savedQueryQuery).then((response) =>
      createRule({ ...rule, saved_id: response.body.id })
    );
    visit(SECURITY_DETECTIONS_RULES_URL);
    goToRuleDetails();
  });

  it('Displays saved query rule info', function () {
    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);

    cy.get(DEFINE_RULE_PANEL_PROGRESS).should('not.exist');

    getDetails(SAVED_QUERY_NAME_DETAILS).should('contain', savedQueryName);
    getDetails(SAVED_QUERY_DETAILS).should('contain', savedQueryQuery);
    getDetails(SAVED_QUERY_FILTERS_DETAILS).should('contain', savedQueryFilterKey);
  });
});
