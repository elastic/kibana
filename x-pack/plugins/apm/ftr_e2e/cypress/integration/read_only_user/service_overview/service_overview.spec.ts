/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import archives_metadata from '../../../fixtures/es_archiver/archives_metadata';

const { start, end } = archives_metadata['apm_8.0.0'];

const serviceOverviewPath = '/app/apm/services/opbeans-node/overview';
const baseUrl = url.format({
  pathname: serviceOverviewPath,
  query: { rangeFrom: start, rangeTo: end },
});

describe('Service Overview', () => {
  beforeEach(() => {
    cy.loginAsReadOnlyUser();
  });

  it('persists transaction type selected when clicking on Transactions tab', () => {
    cy.visit(baseUrl);
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'request'
    );
    cy.get('[data-test-subj="headerFilterTransactionType"]').select('Worker');
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );
    cy.contains('Transactions').click();
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );
  });

  it('persists transaction type selected when clicking on View Transactions link', () => {
    cy.visit(baseUrl);
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'request'
    );
    cy.get('[data-test-subj="headerFilterTransactionType"]').select('Worker');
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );

    cy.contains('View transactions').click();
    cy.get('[data-test-subj="headerFilterTransactionType"]').should(
      'have.value',
      'Worker'
    );
  });

  it('hides dependency tab when RUM service', () => {
    cy.intercept('GET', '/api/apm/services/opbeans-rum/agent?*').as(
      'agentRequest'
    );
    cy.visit(
      url.format({
        pathname: '/app/apm/services/opbeans-rum/overview',
        query: { rangeFrom: start, rangeTo: end },
      })
    );
    cy.contains('Overview');
    cy.contains('Transactions');
    cy.contains('Error');
    cy.contains('Service Map');
    // Waits until the agent request is finished to check the tab.
    cy.wait('@agentRequest');
    cy.get('.euiTabs .euiTab__content').then((elements) => {
      elements.map((index, element) => {
        expect(element.innerText).to.not.equal('Dependencies');
      });
    });
  });
});
