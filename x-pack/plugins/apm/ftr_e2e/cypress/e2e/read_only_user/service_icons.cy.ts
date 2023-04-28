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

const errorsOverviewPage = url.format({
  pathname: '/app/apm/services/opbeans-java/errors',
  query: {
    comparisonEnabled: 'true',
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: start,
    rangeTo: end,
    offset: '1d',
  },
});

describe('Service icon page', () => {
  before(() => {
    synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    // synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  describe('navigations', () => {
    // it('navigates to service overview and service icons are loaded', () => {
    //   cy.visitKibana(serviceOverview);

    //   cy.getByTestSubj('loading-service-icons').should(
    //     'have.text',
    //     'Loading service icons...'
    //   );

    //   cy.getByTestSubj('loading-service-icons').should('exist');

    //   cy.getByTestSubj('loading-service-icons').should('not.exist');
    // });

    it('navigates to service overview and service icons are only loaded once', () => {
      // Overview page
      cy.visitKibana(serviceOverview);
      cy.getByTestSubj('apmMainTemplateHeaderServiceName').should(
        'have.text',
        'opbeans-java'
      );
      cy.get('.euiTab-isSelected').should('have.text', 'Overview');
      cy.getByTestSubj('loading-service-icons').should('exist');
      cy.getByTestSubj('loading-service-icons').should('not.exist');

      // Navigate to errors page
      cy.contains('.euiTab', 'Errors').click();
      cy.get('.euiTab-isSelected').should('have.text', 'Errors');
      cy.getByTestSubj('loading-service-icons').should('not.exist');
    });
  });
});
