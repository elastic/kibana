/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../tasks/login';
import {
  EMPTY_PAGE_BODY,
  EMPTY_PAGE_DOCS_LINK,
  EMPTY_PAGE_INTEGRATIONS_LINK,
} from '../screens/empty_page';

const THREAT_INTEL_PATH = '/app/security/threat_intelligence/';

describe('Empty Page', { testIsolation: false }, () => {
  before(() => {
    login();
    cy.visit(THREAT_INTEL_PATH);
  });

  it('should render the empty page with link to docs and integrations', () => {
    cy.get(EMPTY_PAGE_BODY).should('be.visible');
    cy.get(EMPTY_PAGE_DOCS_LINK).should('be.visible');
    cy.get(EMPTY_PAGE_INTEGRATIONS_LINK).should('be.visible');
  });

  it('should navigate to the integrations page', () => {
    cy.get(EMPTY_PAGE_INTEGRATIONS_LINK).click();
    cy.url().should('include', '/app/integrations/browse/threat_intel');
    cy.get('h1').first().should('contain', 'Integrations');
  });
});
