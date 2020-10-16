/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { case1, connectorIds, mockConnectorsResponse, executeResponses } from '../objects/case';
import { createNewCaseWithConnector } from '../tasks/create_new_case';
import { CONNECTOR_TITLE } from '../screens/edit_connector';
import { goToCreateNewCase } from '../tasks/all_cases';
import { CASES_URL } from '../urls/navigation';

describe('Cases connector incident fields', () => {
  before(() => {
    cy.server();
    cy.route('GET', '**/api/cases/configure/connectors/_find', mockConnectorsResponse);
    cy.route2('POST', `**/api/actions/action/${connectorIds.jira}/_execute`, (req) => {
      const response =
        JSON.parse(req.body).params.subAction === 'issueTypes'
          ? executeResponses.jira.issueTypes
          : executeResponses.jira.fieldsByIssueType;
      req.reply(JSON.stringify(response));
    });
    cy.route2('POST', `**/api/actions/action/${connectorIds.resilient}/_execute`, (req) => {
      const response =
        JSON.parse(req.body).params.subAction === 'incidentTypes'
          ? executeResponses.resilient.incidentTypes
          : executeResponses.resilient.severity;
      req.reply(JSON.stringify(response));
    });
  });
  it('Correct incident fields show when connector is changed', () => {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToCreateNewCase();
    createNewCaseWithConnector(case1);
    cy.get(CONNECTOR_TITLE).should('have.text', 'Resilient');
  });
});
