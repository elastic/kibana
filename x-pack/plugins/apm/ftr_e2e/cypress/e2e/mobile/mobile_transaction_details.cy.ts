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

const mobileTransactionDetailsPageHref = url.format({
  pathname: '/app/apm/mobile-services/synth-android/transactions/view',
  query: {
    rangeFrom: start,
    rangeTo: end,
    transactionName: 'Start View - View Appearing',
  },
});

describe('Mobile transaction details page', () => {
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
  });

  after(() => {
    synthtrace.clean();
  });

  it('opens the action menu popup when clicking the investigate button', () => {
    cy.visitKibana(mobileTransactionDetailsPageHref);
    cy.getByTestSubj('apmActionMenuButtonInvestigateButton').click();
    cy.getByTestSubj('apmActionMenuInvestigateButtonPopup');
  });
});
