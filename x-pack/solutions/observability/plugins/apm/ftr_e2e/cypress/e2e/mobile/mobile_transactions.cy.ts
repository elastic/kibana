/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../synthtrace';
import { generateMobileData } from './generate_data';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const mobileTransactionsPageHref = url.format({
  pathname: '/app/apm/mobile-services/synth-android/transactions',
  query: {
    rangeFrom: start,
    rangeTo: end,
  },
});

describe('Mobile transactions page', () => {
  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  describe('when data is loaded', () => {
    before(() => {
      synthtrace.index(
        generateMobileData({
          from: new Date(start).getTime(),
          to: new Date(end).getTime(),
        })
      );
    });

    after(() => {
      synthtrace.clean();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/207040
    describe.skip('when click on tab shows correct table', () => {
      it('shows version tab', () => {
        cy.visitKibana(mobileTransactionsPageHref);
        cy.getByTestSubj('apmAppVersionTab').click();
        cy.getByTestSubj('apmAppVersionTab').should('have.attr', 'aria-selected', 'true');
        cy.url().should('include', 'mobileSelectedTab=app_version_tab');
      });

      it('shows OS version tab', () => {
        cy.visitKibana(mobileTransactionsPageHref);
        cy.getByTestSubj('apmOsVersionTab').click();
        cy.getByTestSubj('apmOsVersionTab').should('have.attr', 'aria-selected', 'true');
        cy.url().should('include', 'mobileSelectedTab=os_version_tab');
      });

      it('shows devices tab', () => {
        cy.visitKibana(mobileTransactionsPageHref);
        cy.getByTestSubj('apmDevicesTab').click();
        cy.getByTestSubj('apmDevicesTab').should('have.attr', 'aria-selected', 'true');
        cy.url().should('include', 'mobileSelectedTab=devices_tab');
      });
    });
  });
});
