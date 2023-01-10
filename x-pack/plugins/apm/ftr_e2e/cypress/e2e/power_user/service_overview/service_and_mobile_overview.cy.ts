/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { synthtrace } from '../../../../synthtrace';
import { generateData } from './generate_data';

const start = Date.now() - 1000;
const end = Date.now();

const rangeFrom = new Date(start).toISOString();
const rangeTo = new Date(end).toISOString();

const serviceInventory = url.format({
  pathname: 'app/apm/services',
  query: {
    rangeFrom,
    rangeTo,
  },
});

describe('Service overview page', () => {
  before(() => {
    synthtrace.index(
      generateData({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  describe('When navigating to service inventory', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
      cy.visitKibana(serviceInventory);
    });

    describe('when click on apm service', () => {
      it('shows the service overview page', () => {
        cy.contains('synth-go-1').click();
        cy.url().should('include', '/services/synth-go-1/overview'); // => true
      });
    });

    describe('when click on android service', () => {
      it('shows the mobile service overview page', () => {
        cy.contains('synth-android').click();
        cy.url().should('include', '/mobile-services/synth-android/overview'); // => true
      });
    });

    describe('when click on iOS service', () => {
      it('shows the mobile service overview page', () => {
        cy.contains('synth-ios').click();
        cy.url().should('include', '/mobile-services/synth-ios/overview'); // => true
      });
    });
  });

  describe('accessing service overview from URL', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
    });

    describe('accessing apm service', () => {
      it('shows the service overview page with default params', () => {
        const apmServiceOverview = url.format({
          pathname: 'app/apm/services/synth-go-1',
          query: {
            rangeFrom,
            rangeTo,
          },
        });

        cy.visitKibana(apmServiceOverview);
        cy.location().should((loc) => {
          expect(loc.pathname).to.eq('/app/apm/services/synth-go-1/overview');
          expect(loc.search).to.eq(
            `?comparisonEnabled=true&environment=ENVIRONMENT_ALL&kuery=&latencyAggregationType=avg&rangeFrom=${rangeFrom}&rangeTo=${rangeTo}&serviceGroup=&offset=1d&transactionType=request`
          );
        });
      });
    });

    describe('accessing iOS service', () => {
      it('shows the service overview page with default params', () => {
        const apmMobileServiceOverview = url.format({
          pathname: 'app/apm/mobile-services/synth-ios',
          query: {
            rangeFrom,
            rangeTo,
          },
        });

        cy.visitKibana(apmMobileServiceOverview);

        cy.location().should((loc) => {
          expect(loc.pathname).to.eq(
            '/app/apm/mobile-services/synth-ios/overview'
          );
          expect(loc.search).to.eq(
            `?comparisonEnabled=true&environment=ENVIRONMENT_ALL&kuery=&latencyAggregationType=avg&rangeFrom=${rangeFrom}&rangeTo=${rangeTo}&serviceGroup=&offset=1d&transactionType=request`
          );
        });
      });
    });

    describe('accessing mobile service from apm service route', () => {
      it('redirects to mobile service route with default params', () => {
        const apmMobileServiceOverview = url.format({
          pathname: 'app/apm/services/synth-android',
          query: {
            rangeFrom,
            rangeTo,
          },
        });

        cy.visitKibana(apmMobileServiceOverview);

        cy.location().should((loc) => {
          expect(loc.pathname).to.eq(
            '/app/apm/mobile-services/synth-android/overview'
          );
          expect(loc.search).to.eq(
            `?comparisonEnabled=true&environment=ENVIRONMENT_ALL&kuery=&latencyAggregationType=avg&rangeFrom=${rangeFrom}&rangeTo=${rangeTo}&serviceGroup=&offset=1d&transactionType=request`
          );
        });
      });
    });
  });
});
