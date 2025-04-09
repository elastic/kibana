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
  before(() => {
    synthtrace.index(
      generateMobileData({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
    cy.visitKibana(mobileTransactionsPageHref);
    cy.waitUntilPageContentIsLoaded();
  });

  after(() => {
    synthtrace.clean();
  });

  it('when click on version tab shows correct table', () => {
    cy.getByTestSubj('apmAppVersionTab').click();
    cy.getByTestSubj('apmAppVersionTab').should('have.attr', 'aria-selected', 'true');
    cy.url().should('include', 'mobileSelectedTab=app_version_tab');
  });

  it('when click on OS version tab shows correct table', () => {
    cy.getByTestSubj('apmOsVersionTab').click();
    cy.getByTestSubj('apmOsVersionTab').should('have.attr', 'aria-selected', 'true');
    cy.url().should('include', 'mobileSelectedTab=os_version_tab');
  });

  it('when click on devices tab shows correct table', () => {
    cy.getByTestSubj('apmDevicesTab').click();
    cy.getByTestSubj('apmDevicesTab').should('have.attr', 'aria-selected', 'true');
    cy.url().should('include', 'mobileSelectedTab=devices_tab');
  });
});
