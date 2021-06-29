/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';
import { DEFAULT_TIMEOUT } from './csm_dashboard';
import { waitForLoadingToFinish } from './utils';

/** The default time in ms to wait for a Cypress command to complete */

Given(`a user clicks the page load breakdown filter`, () => {
  waitForLoadingToFinish();
  cy.get('.euiStat__title-isLoading').should('not.exist');
  const breakDownBtn = cy.get(
    '[data-test-subj=pldBreakdownFilter]',
    DEFAULT_TIMEOUT
  );
  breakDownBtn.click();
});

When(`the user selected the breakdown`, () => {
  cy.get('[id="user_agent.name"]', DEFAULT_TIMEOUT).click();
  // click outside popover to close it
  cy.get('[data-cy=pageLoadDist]').click();
});

Then(`breakdown series should appear in chart`, () => {
  cy.get('.euiLoadingChart').should('not.exist');

  cy.get('[data-cy=pageLoadDist]').within(() => {
    cy.get('button.echLegendItem__label[title=Chrome] ', DEFAULT_TIMEOUT)
      .invoke('text')
      .should('eq', 'Chrome');

    cy.get('button.echLegendItem__label', DEFAULT_TIMEOUT).should(
      'have.text',
      'ChromeChrome Mobile WebViewSafariFirefoxMobile SafariChrome MobileChrome Mobile iOSOverall'
    );
  });
});
