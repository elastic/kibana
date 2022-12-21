/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceOverviewHref = url.format({
  pathname: '/app/apm/services/opbeans-java/overview',
  query: { rangeFrom: start, rangeTo: end },
});

describe('Errors table', () => {
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

  it('errors table is populated', () => {
    cy.visitKibana(serviceOverviewHref);
    cy.contains('opbeans-java');
    cy.contains('[MockError] Foo');
  });

  it('navigates to the errors page', () => {
    cy.visitKibana(serviceOverviewHref);
    cy.contains('opbeans-java');
    cy.contains('a', 'View errors').click();
    cy.url().should('include', '/opbeans-java/errors');
  });

  it('clicking on type adds a filter in the kuerybar and navigates to errors page', () => {
    cy.visitKibana(serviceOverviewHref);
    cy.getByTestSubj('headerFilterKuerybar').invoke('val').should('be.empty');
    // `force: true` because Cypress says the element is 0x0
    cy.contains('Exception').click({
      force: true,
    });
    cy.getByTestSubj('headerFilterKuerybar').its('length').should('be.gt', 0);
    cy.get('table').find('td:contains("Exception")').should('have.length', 1);
  });

  it('navigates to error detail page', () => {
    cy.visitKibana(serviceOverviewHref);
    cy.contains('a', '[MockError] Foo').click();
    cy.contains('div', 'Exception message');
  });
});
