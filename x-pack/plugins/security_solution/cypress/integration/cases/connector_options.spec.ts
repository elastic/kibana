/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import {
  case1,
  connectorIds,
  mockConnectorsResponse,
  executeResponses,
  ibmResilientConnectorOptions,
  jiraConnectorOptions,
  serviceNowConnectorOpions,
} from '../../objects/case';
import {
  createCase,
  fillCasesMandatoryfields,
  fillIbmResilientConnectorOptions,
  fillJiraConnectorOptions,
  fillServiceNowConnectorOptions,
} from '../../tasks/create_new_case';
import { goToCreateNewCase } from '../../tasks/all_cases';
import { CASES_URL } from '../../urls/navigation';
import { CONNECTOR_CARD_DETAILS, CONNECTOR_TITLE } from '../../screens/case_details';
import { cleanKibana } from '../../tasks/common';

describe('Cases connector incident fields', () => {
  beforeEach(() => {
    cleanKibana();
    cy.intercept('GET', '/api/cases/configure/connectors/_find', mockConnectorsResponse);
    cy.intercept('POST', `/api/actions/action/${connectorIds.jira}/_execute`, (req) => {
      const response =
        req.body.params.subAction === 'issueTypes'
          ? executeResponses.jira.issueTypes
          : executeResponses.jira.fieldsByIssueType;
      req.reply(response);
    });
    cy.intercept('POST', `/api/actions/action/${connectorIds.resilient}/_execute`, (req) => {
      const response =
        req.body.params.subAction === 'incidentTypes'
          ? executeResponses.resilient.incidentTypes
          : executeResponses.resilient.severity;
      req.reply(response);
    });
  });

  it('Correct incident fields show when connector is changed', () => {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToCreateNewCase();
    fillCasesMandatoryfields(case1);
    fillJiraConnectorOptions(jiraConnectorOptions);
    fillServiceNowConnectorOptions(serviceNowConnectorOpions);
    fillIbmResilientConnectorOptions(ibmResilientConnectorOptions);
    createCase();

    cy.get(CONNECTOR_TITLE).should('have.text', ibmResilientConnectorOptions.title);
    cy.get(CONNECTOR_CARD_DETAILS).should(
      'have.text',
      `${
        ibmResilientConnectorOptions.title
      }Incident Types: ${ibmResilientConnectorOptions.incidentTypes.join(', ')}Severity: ${
        ibmResilientConnectorOptions.severity
      }`
    );
  });
});
