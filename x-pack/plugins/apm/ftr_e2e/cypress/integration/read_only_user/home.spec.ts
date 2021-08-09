/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import archives_metadata from '../../fixtures/es_archiver/archives_metadata';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

const { start, end } = archives_metadata['apm_8.0.0'];

const serviceInventoryHref = url.format({
  pathname: '/app/apm/services',
  query: { rangeFrom: start, rangeTo: end },
});

describe('Home page', () => {
  before(() => {
    esArchiverLoad('apm_8.0.0');
  });
  after(() => {
    esArchiverUnload('apm_8.0.0');
  });
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });
  it('Redirects to service page with rangeFrom and rangeTo added to the URL', () => {
    cy.visit('/app/apm');

    cy.url().should(
      'include',
      'app/apm/services?rangeFrom=now-15m&rangeTo=now'
    );
  });

  it('includes services with only metric documents', () => {
    cy.visit(
      `${serviceInventoryHref}&kuery=not%2520(processor.event%2520%253A%2522transaction%2522%2520)`
    );
    cy.contains('opbeans-python');
    cy.contains('opbeans-java');
    cy.contains('opbeans-node');
  });

  describe('navigations', () => {
    it('navigates to service overview page with transaction type', () => {
      cy.visit(serviceInventoryHref);
      cy.get('[data-test-subj="serviceLink_rum-js"]').then((element) => {
        element[0].click();
      });
      cy.get('[data-test-subj="headerFilterTransactionType"]').should(
        'have.value',
        'page-load'
      );
    });
  });
});
