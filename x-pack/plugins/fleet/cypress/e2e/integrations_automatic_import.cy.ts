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
} from '../screens/integrations_automatic_import';
import { cleanupAgentPolicies } from '../tasks/cleanup';
import { login } from '../tasks/login';

describe('Add Integration - Automatic Import', () => {
  beforeEach(() => {
    login();

    cleanupAgentPolicies();
    deleteIntegrations();
  });

  afterEach(() => {});

  it('should provide list of connectors to choose from', () => {
    cy.visit(CREATE_INTEGRATION_LANDING_PAGE);

    cy.getBySel(ASSISTANT_BUTTON).should('exist');
    cy.getBySel(UPLOAD_PACKAGE_LINK).should('exist');
    cy.getBySel(TECH_PREVIEW_BADGE).should('exist');

    cy.getBySel(ASSISTANT_BUTTON).click();
  });
});
