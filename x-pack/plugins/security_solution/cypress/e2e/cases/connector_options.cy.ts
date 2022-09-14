/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visitWithoutDateRange } from '../../tasks/login';
import {
  getCase1,
  getConnectorIds,
  getMockConnectorsResponse,
  getExecuteResponses,
  getIbmResilientConnectorOptions,
  getJiraConnectorOptions,
  getServiceNowConnectorOptions,
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
  before(() => {
    cleanKibana();
    login();
  });
  beforeEach(() => {
    cy.intercept('GET', '/api/cases/configure/connectors/_find', getMockConnectorsResponse());
    cy.intercept('POST', `/api/actions/connector/${getConnectorIds().sn}/_execute`, (req) => {
      const response =
        req.body.params.subAction === 'getChoices'
          ? getExecuteResponses().servicenow.choices
          : { status: 'ok', data: [] };
      req.reply(response);
    });
    cy.intercept('POST', `/api/actions/connector/${getConnectorIds().jira}/_execute`, (req) => {
      const response =
        req.body.params.subAction === 'issueTypes'
          ? getExecuteResponses().jira.issueTypes
          : getExecuteResponses().jira.fieldsByIssueType;
      req.reply(response);
    });
    cy.intercept(
      'POST',
      `/api/actions/connector/${getConnectorIds().resilient}/_execute`,
      (req) => {
        const response =
          req.body.params.subAction === 'incidentTypes'
            ? getExecuteResponses().resilient.incidentTypes
            : getExecuteResponses().resilient.severity;
        req.reply(response);
      }
    );
  });

  it('Correct incident fields show when connector is changed', () => {
    visitWithoutDateRange(CASES_URL);
    goToCreateNewCase();
    fillCasesMandatoryfields(getCase1());
    fillJiraConnectorOptions(getJiraConnectorOptions());
    fillServiceNowConnectorOptions(getServiceNowConnectorOptions());
    fillIbmResilientConnectorOptions(getIbmResilientConnectorOptions());
    createCase();

    cy.get(CONNECTOR_TITLE).should('have.text', getIbmResilientConnectorOptions().title);
    cy.get(CONNECTOR_CARD_DETAILS).should(
      'have.text',
      `${
        getIbmResilientConnectorOptions().title
      }Incident Types: ${getIbmResilientConnectorOptions().incidentTypes.join(', ')}Severity: ${
        getIbmResilientConnectorOptions().severity
      }`
    );
  });
});
