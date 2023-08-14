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

describe('Service map', () => {
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

  describe('When navigating to service map', () => {
    it('opens service map', () => {
      cy.visitKibana(serviceMapHref);
      cy.contains('h1', 'Services');
    });

    it('opens detailed service map', () => {
      cy.visitKibana(detailedServiceMap);
      cy.contains('h1', 'opbeans-java');
    });

    describe('When there is no data', () => {
      it('shows empty state', () => {
        cy.visitKibana(serviceMapHref);
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
