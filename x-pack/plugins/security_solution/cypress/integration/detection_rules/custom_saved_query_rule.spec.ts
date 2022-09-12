/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';

import {
  DEFINE_CONTINUE_BUTTON,
  LOAD_QUERY_DYNAMICALLY_CHECKBOX,
} from '../../screens/create_new_rule';
import {
  RULE_NAME_HEADER,
  SAVED_QUERY_NAME_DETAILS,
  DEFINE_RULE_PANEL_PROGRESS,
} from '../../screens/rule_details';

import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { createSavedQuery } from '../../tasks/api_calls/saved_queries';
import { cleanKibana, deleteAlertsAndRules, deleteSavedQueries } from '../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillScheduleRuleAndContinue,
  loadSavedQuery,
  getCustomQueryInput,
} from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';
import { getDetails } from '../../tasks/rule_details';

import { RULE_CREATION } from '../../urls/navigation';

const savedQueryName = 'custom saved query';
const savedQueryQuery = 'process.name: test';

describe('Custom query rules', () => {
  before(() => {
    cleanKibana();
    login();
  });
  describe('Custom saved_query detection rule creation', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      deleteSavedQueries();
      createTimeline(getNewRule().timeline).then((response) => {
        cy.wrap({
          ...getNewRule(),
          timeline: {
            ...getNewRule().timeline,
            id: response.body.data.persistTimeline.timeline.savedObjectId,
          },
        }).as('rule');
      });
      createSavedQuery(savedQueryName, savedQueryQuery);
    });

    it('Creates saved query rule', function () {
      visit(RULE_CREATION);

      loadSavedQuery(savedQueryName, savedQueryQuery);

      // edit loaded saved query
      getCustomQueryInput()
        .type(' AND random query')
        .should('have.value', [savedQueryQuery, ' AND random query'].join(''));

      // when clicking load query dynamically checkbox, saved query should be shown in query input and input should be disabled
      cy.get(LOAD_QUERY_DYNAMICALLY_CHECKBOX).click({ force: true }).should('be.checked');
      getCustomQueryInput().should('have.value', savedQueryQuery).should('be.disabled');

      cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
      cy.get(DEFINE_CONTINUE_BUTTON).should('not.exist');

      fillAboutRuleAndContinue(this.rule);
      fillScheduleRuleAndContinue(this.rule);
      cy.intercept('POST', '/api/detection_engine/rules').as('savedQueryRule');
      createAndEnableRule();

      cy.wait('@savedQueryRule').then(({ response }) => {
        // created rule should have saved_query type
        cy.wrap(response?.body.type).should('equal', 'saved_query');
      });

      goToRuleDetails();

      cy.get(RULE_NAME_HEADER).should('contain', `${this.rule.name}`);

      cy.get(DEFINE_RULE_PANEL_PROGRESS).should('not.exist');
      getDetails(SAVED_QUERY_NAME_DETAILS).should('contain', savedQueryName);
    });
  });
});
