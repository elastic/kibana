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

const serviceOverviewHref = url.format({
  pathname: '/app/apm/services/opbeans-java/alerts',
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

  it('Alerts table with the search bar is populated', () => {
    cy.visitKibana(serviceOverviewHref);
    cy.contains('opbeans-java');
    cy.get(
      '[data-test-subj="environmentFilter"] [data-test-subj="comboBoxSearchInput"]'
    ).should('have.value', 'All');
    cy.contains('Active');
    cy.contains('Recovered');
    cy.getByTestSubj('globalQueryBar').should('exist');
  });
});
