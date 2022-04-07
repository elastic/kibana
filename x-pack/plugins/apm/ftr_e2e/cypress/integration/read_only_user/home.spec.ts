/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../synthtrace';
import { opbeans } from '../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceInventoryHref = url.format({
  pathname: '/app/apm/services',
  query: {
    comparisonEnabled: 'true',
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: start,
    rangeTo: end,
    offset: '1d',
  },
});

describe('Home page', () => {
  before(async () => {
    await synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(async () => {
    await synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  it('Redirects to service page with comparisonEnabled, environment, rangeFrom, rangeTo and offset added to the URL', () => {
    cy.visit('/app/apm');

    cy.url().should(
      'include',
      'app/apm/services?comparisonEnabled=true&environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now&offset=1d'
    );
  });

  it('includes services with only metric documents', () => {
    cy.visit(
      `${serviceInventoryHref}&kuery=not%20(processor.event%3A%22transaction%22)`
    );
    cy.contains('opbeans-java');
    cy.contains('opbeans-node');
  });

  describe('navigations', () => {
    it('navigates to service overview page with transaction type', () => {
      cy.visit(serviceInventoryHref);

      cy.contains('Services');
      cy.contains('opbeans-rum').realClick();

      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'page-load'
      );
    });
  });
});
