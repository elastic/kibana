/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteIntegrations } from '../tasks/integrations';
import {
  UPLOAD_PACKAGE_LINK,
  ASSISTANT_BUTTON,
  TECH_PREVIEW_BADGE,
  CREATE_INTEGRATION_LANDING_PAGE,
  BUTTON_FOOTER_NEXT,
  INTEGRATION_TITLE_INPUT,
  INTEGRATION_DESCRIPTION_INPUT,
  DATASTREAM_TITLE_INPUT,
  DATASTREAM_DESCRIPTION_INPUT,
  DATASTREAM_NAME_INPUT,
  DATA_COLLECTION_METHOD_INPUT,
  LOGS_SAMPLE_FILE_PICKER,
} from '../screens/integrations_automatic_import';
import { cleanupAgentPolicies } from '../tasks/cleanup';
import { login } from '../tasks/login';
import { createBedrockConnector, deleteConnectors } from '../tasks/api_calls/connectors';
import { results } from '../tasks/api_calls/graph_calls';

describe('Add Integration - Automatic Import', () => {
  beforeEach(() => {
    login();

    cleanupAgentPolicies();
    deleteIntegrations();

    // Create a mock connector
    deleteConnectors();
    createBedrockConnector();
    // Mock API Responses
    cy.intercept('POST', '/api/integration_assistant/ecs', {
      statusCode: 200,
      body: {
        results,
      },
    });
    cy.intercept('POST', '/api/integration_assistant/categorization', {
      statusCode: 200,
      body: {
        results,
      },
    });
    cy.intercept('POST', '/api/integration_assistant/related', {
      statusCode: 200,
      body: {
        results,
      },
    });
  });

  afterEach(() => {});

  it('should create an integration', () => {
    cy.visit(CREATE_INTEGRATION_LANDING_PAGE);

    cy.getBySel(ASSISTANT_BUTTON).should('exist');
    cy.getBySel(UPLOAD_PACKAGE_LINK).should('exist');
    cy.getBySel(TECH_PREVIEW_BADGE).should('exist');

    // Create Integration Assistant Page
    cy.getBySel(ASSISTANT_BUTTON).click();
    cy.getBySel(BUTTON_FOOTER_NEXT).click();

    // Integration details Page
    cy.getBySel(INTEGRATION_TITLE_INPUT).type('Test Integration');
    cy.getBySel(INTEGRATION_DESCRIPTION_INPUT).type('Test Integration Description');
    cy.getBySel(BUTTON_FOOTER_NEXT).click();

    // Datastream details page
    cy.getBySel(DATASTREAM_TITLE_INPUT).type('Audit');
    cy.getBySel(DATASTREAM_DESCRIPTION_INPUT).type('Test Datastream Description');
    cy.getBySel(DATASTREAM_NAME_INPUT).type('audit');
    cy.getBySel(DATA_COLLECTION_METHOD_INPUT).type('file stream').trigger('mousemove').click();

    // Select sample logs file and Analyze logs
    cy.fixture('teleport.ndjson', null).as('myFixture');
    cy.getBySel(LOGS_SAMPLE_FILE_PICKER).selectFile('@myFixture');
    cy.getBySel(BUTTON_FOOTER_NEXT).click();
  });
});
