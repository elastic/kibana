/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../synthtrace';
import { opbeans } from '../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceOverview = url.format({
  pathname: '/app/apm/services/opbeans-java/overview',
  query: {
    comparisonEnabled: 'true',
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: start,
    rangeTo: end,
    offset: '1d',
  },
});

describe('When navigating between pages', () => {
  before(() => {
    synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  it('should only load certain resources once', () => {
    cy.intercept('**/internal/apm/has_data').as('hasDataRequest');
    cy.intercept('**/internal/apm/services/opbeans-java/metadata/icons**').as(
      'serviceIconsRequest'
    );
    cy.intercept('**/apm/fleet/has_apm_policies').as('apmPoliciesRequest');

    // Overview page
    cy.visitKibana(serviceOverview);
    cy.get('.euiTab-isSelected').should('have.text', 'Overview');

    // it should load resources once
    cy.get('@hasDataRequest.all').should('have.length', 1);
    cy.get('@serviceIconsRequest.all').should('have.length', 1);
    cy.get('@apmPoliciesRequest.all').should('have.length', 1);

    // Navigate to errors page
    cy.contains('.euiTab', 'Errors').click();
    cy.get('.euiTab-isSelected').should('have.text', 'Errors');

    // page have loaded correctly
    cy.get('.euiLoadingChart').should('not.exist');
    cy.get('[data-test-subj="errorDistribution"]').should('exist');

    // it should not load resources again
    cy.get('@hasDataRequest.all').should('have.length', 1);
    cy.get('@serviceIconsRequest.all').should('have.length', 1);
    cy.get('@apmPoliciesRequest.all').should('have.length', 1);
  });
});
