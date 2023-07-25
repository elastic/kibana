/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedQueryRule } from '../../../objects/rule';

import {
  DEFINE_CONTINUE_BUTTON,
  CUSTOM_QUERY_BAR,
  QUERY_BAR,
} from '../../../screens/create_new_rule';
import { TOASTER } from '../../../screens/alerts_detection_rules';
import {
  RULE_NAME_HEADER,
  SAVED_QUERY_NAME_DETAILS,
  SAVED_QUERY_DETAILS,
  SAVED_QUERY_FILTERS_DETAILS,
  DEFINE_RULE_PANEL_PROGRESS,
} from '../../../screens/rule_details';

import { goToRuleDetails, editFirstRule } from '../../../tasks/alerts_detection_rules';
import { createSavedQuery, deleteSavedQueries } from '../../../tasks/api_calls/saved_queries';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectAndLoadSavedQuery,
  getCustomQueryInput,
  checkLoadQueryDynamically,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';
import { getDetails } from '../../../tasks/rule_details';
import { createRule } from '../../../tasks/api_calls/rules';

import { RULE_CREATION, SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';

const savedQueryName = 'custom saved query';
const savedQueryQuery = 'process.name: test';
const savedQueryFilterKey = 'testAgent.value';

describe('Custom query rule with saved_query', () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deleteSavedQueries();
  });

  it('Creates saved query rule', function () {
    const rule = getSavedQueryRule();
    createSavedQuery(savedQueryName, savedQueryQuery, savedQueryFilterKey);
    visit(RULE_CREATION);

    selectAndLoadSavedQuery(savedQueryName, savedQueryQuery);

    // edit loaded saved query
    getCustomQueryInput()
      .type(' AND random query')
      .should('have.value', [savedQueryQuery, ' AND random query'].join(''));

    // when clicking load query dynamically checkbox, saved query should be shown in query input and input should be disabled
    checkLoadQueryDynamically();
    getCustomQueryInput().should('have.value', savedQueryQuery).should('be.disabled');
    cy.get(QUERY_BAR).should('contain', savedQueryFilterKey);

    cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();

    fillAboutRuleAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    cy.intercept('POST', '/api/detection_engine/rules').as('savedQueryRule');
    createAndEnableRule();

    cy.wait('@savedQueryRule').then(({ response }) => {
      // created rule should have saved_query type
      cy.wrap(response?.body.type).should('equal', 'saved_query');
    });

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);

    cy.get(DEFINE_RULE_PANEL_PROGRESS).should('not.exist');

    getDetails(SAVED_QUERY_NAME_DETAILS).should('contain', savedQueryName);
    getDetails(SAVED_QUERY_DETAILS).should('contain', savedQueryQuery);
    getDetails(SAVED_QUERY_FILTERS_DETAILS).should('contain', savedQueryFilterKey);
  });

  context('Non existent saved query', () => {
    const FAILED_TO_LOAD_ERROR = 'Failed to load the saved query';
    beforeEach(() => {
      createRule(getSavedQueryRule({ saved_id: 'non-existent', query: undefined }));
      visit(SECURITY_DETECTIONS_RULES_URL);
    });
    it('Shows error toast on details page when saved query can not be loaded', function () {
      goToRuleDetails();

      cy.get(TOASTER).should('contain', FAILED_TO_LOAD_ERROR);
    });

    // TODO: this error depended on the schema validation running. Can we show the error
    // based on the saved query failing to load instead of relying on the schema validation?
    it.skip('Shows validation error on rule edit when saved query can not be loaded', function () {
      editFirstRule();

      cy.get(CUSTOM_QUERY_BAR).should('contain', FAILED_TO_LOAD_ERROR);
    });
  });
});
