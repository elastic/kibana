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
const end = '2021-10-10T00:01:00.000Z';

const serviceMapHref = url.format({
  pathname: '/app/apm/service-map',
  query: {
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: start,
    rangeTo: end,
  },
});

const detailedServiceMap = url.format({
  pathname: '/app/apm/services/opbeans-java/service-map',
  query: {
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: start,
    rangeTo: end,
  },
});

describe('service map', () => {
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

  describe('when navigating to service map', () => {
    beforeEach(() => {
      cy.intercept('GET', '/internal/apm/service-map?*').as('serviceMap');
      cy.visitKibana(serviceMapHref);

      cy.wait('@serviceMap');
    });

    it('shows nodes in service map', { retries: 3 }, () => {
      cy.wait(500);
      cy.getByTestSubj('serviceMap').matchImage();
    });

    it('shows nodes in detailed service map', () => {
      cy.visitKibana(detailedServiceMap);
      cy.contains('h1', 'opbeans-java');
      cy.wait(500);
      cy.getByTestSubj('serviceMap').matchImage();
    });

    describe('when there is no data', () => {
      it('shows empty state', () => {
        // we need to dismiss the service-group call out first
        cy.contains('Dismiss').click();
        cy.getByTestSubj('apmUnifiedSearchBar').type('_id : foo{enter}');
        cy.contains('No services available');
        // search bar is still visible
        cy.getByTestSubj('apmUnifiedSearchBar');
      });
    });
  });
});
