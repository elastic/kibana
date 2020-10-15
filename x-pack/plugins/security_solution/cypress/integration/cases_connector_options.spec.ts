/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { case1, ids, mockConnectorsResponse, responses } from '../objects/case';
import { createNewCaseWithConnector } from '../tasks/create_new_case';
import { CONNECTOR_TITLE } from '../screens/edit_connector';
import { goToCreateNewCase } from '../tasks/all_cases';
import { CASES_URL } from '../urls/navigation';

describe('Cases connector incident fields', () => {
  before(() => {
    cy.server();
    cy.route('GET', '**/api/cases/configure/connectors/_find', mockConnectorsResponse);
    cy.route2('POST', `**/api/actions/action/${ids.jira}/_execute`, (req) => {
      const response =
        JSON.parse(req.body).params.subAction === 'issueTypes'
          ? JSON.stringify(responses.jira.issueTypes)
          : JSON.stringify(responses.jira.fieldsByIssueType);
      req.reply(response);
    });
    cy.route2('POST', `**/api/actions/action/${ids.resilient}/_execute`, (req) => {
      const response =
        JSON.parse(req.body).params.subAction === 'incidentTypes'
          ? JSON.stringify(responses.resilient.incidentTypes)
          : JSON.stringify(responses.resilient.severity);
      req.reply(response);
    });
  });
  it('Correct incident fields show when connector is changed', () => {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToCreateNewCase();
    createNewCaseWithConnector(case1);
    cy.get(CONNECTOR_TITLE).should('have.text', 'Resilient');
  });
});
