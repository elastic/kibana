/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IbmResilientConnectorOptions,
  JiraConnectorOptions,
  ServiceNowconnectorOptions,
  TestCase,
} from '../objects/case';

import {
  BACK_TO_CASES_BTN,
  DESCRIPTION_INPUT,
  SUBMIT_BTN,
  INSERT_TIMELINE_BTN,
  LOADING_SPINNER,
  TAGS_INPUT,
  TIMELINE_SEARCHBOX,
  TITLE_INPUT,
} from '../screens/create_new_case';
import {
  CONNECTOR_RESILIENT,
  CONNECTOR_SELECTOR,
  SELECT_IMPACT,
  SELECT_INCIDENT_TYPE,
  SELECT_ISSUE_TYPE,
  SELECT_JIRA,
  SELECT_PRIORITY,
  SELECT_RESILIENT,
  SELECT_SEVERITY,
  SELECT_SN,
  SELECT_URGENCY,
} from '../screens/edit_connector';

export const backToCases = () => {
  cy.get(BACK_TO_CASES_BTN).click({ force: true });
};

export const fillCasesMandatoryfields = (newCase: TestCase) => {
  cy.get(TITLE_INPUT).type(newCase.name, { force: true });
  newCase.tags.forEach((tag) => {
    cy.get(TAGS_INPUT).type(`${tag}{enter}`, { force: true });
  });
  cy.get(DESCRIPTION_INPUT).type(`${newCase.description} `, { force: true });
};

export const attachTimeline = (newCase: TestCase) => {
  cy.get(INSERT_TIMELINE_BTN).click({ force: true });
  cy.get(TIMELINE_SEARCHBOX).type(`${newCase.timeline.title}{enter}`);
};

export const createCase = () => {
  cy.get(SUBMIT_BTN).click({ force: true });
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
};

export const fillJiraConnectorOptions = (jiraConnector: JiraConnectorOptions) => {
  cy.get(CONNECTOR_SELECTOR).click({ force: true });
  cy.get(SELECT_JIRA).click({ force: true });
  cy.get(SELECT_ISSUE_TYPE).should('exist');

  cy.get(SELECT_PRIORITY).should('exist');
  cy.get(SELECT_ISSUE_TYPE).select(jiraConnector.issueType);
  cy.get(SELECT_PRIORITY).select(jiraConnector.priority);
};

export const fillServiceNowConnectorOptions = (
  serviceNowConnectorOpions: ServiceNowconnectorOptions
) => {
  cy.get(CONNECTOR_SELECTOR).click({ force: true });
  cy.get(SELECT_SN).click({ force: true });
  cy.get(SELECT_SEVERITY).should('exist');
  cy.get(SELECT_URGENCY).should('exist');
  cy.get(SELECT_IMPACT).should('exist');
  cy.get(SELECT_URGENCY).select(serviceNowConnectorOpions.urgency);
  cy.get(SELECT_SEVERITY).select(serviceNowConnectorOpions.severity);
  cy.get(SELECT_IMPACT).select(serviceNowConnectorOpions.impact);
};

export const fillIbmResilientConnectorOptions = (
  ibmResilientConnector: IbmResilientConnectorOptions
) => {
  cy.get(CONNECTOR_SELECTOR).click({ force: true });
  cy.get(SELECT_RESILIENT).click({ force: true });
  cy.get(SELECT_INCIDENT_TYPE).should('exist');
  cy.get(SELECT_SEVERITY).should('exist');
  ibmResilientConnector.incidentTypes.forEach((incidentType) => {
    cy.get(SELECT_INCIDENT_TYPE).type(`${incidentType}{enter}`, { force: true });
  });
  cy.get(CONNECTOR_RESILIENT).click();
  cy.get(SELECT_SEVERITY).select(ibmResilientConnector.severity);
};
