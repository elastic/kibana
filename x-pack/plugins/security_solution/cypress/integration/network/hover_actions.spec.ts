/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TOP_N_CONTAINER } from '../../screens/network/flows';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../../screens/search_bar';
import { DATA_PROVIDERS } from '../../screens/timeline';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';
import { NETWORK_URL } from '../../urls/navigation';
import {
  clickOnAddToTimeline,
  clickOnCopyValue,
  clickOnFilterIn,
  clickOnFilterOut,
  clickOnShowTopN,
  openHoverActions,
} from '../../tasks/network/flows';
import { openTimelineUsingToggle } from '../../tasks/security_main';

const testDomain = 'endpoint-dev-es.app.elstc.co';

describe('Hover actions', () => {
  const onBeforeLoadCallback = (win: Cypress.AUTWindow) => {
    // avoid cypress being held by windows prompt and timeout
    cy.stub(win, 'prompt').returns(true);
  };

  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    loginAndWaitForPage(NETWORK_URL, undefined, onBeforeLoadCallback);
    openHoverActions();
  });

  it('Adds global filter - filter in', () => {
    clickOnFilterIn();

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('have.text', `destination.domain: ${testDomain}`);
  });

  it('Adds global filter - filter out', () => {
    clickOnFilterOut();
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
      'contains.text',
      `NOT destination.domain: ${testDomain}`
    );
  });

  it('Adds to timeline', () => {
    const DATA_PROVIDER_ITEM_NUMBER = 1;
    clickOnAddToTimeline();
    openTimelineUsingToggle();

    cy.get(DATA_PROVIDERS).should('have.length', DATA_PROVIDER_ITEM_NUMBER);
    cy.get(DATA_PROVIDERS).should('have.text', `destination.domain: "${testDomain}"`);
  });

  it('Show topN', () => {
    clickOnShowTopN();
    cy.get(TOP_N_CONTAINER).should('exist').should('contain.text', 'Top destination.domain');
  });

  it('Copy value', () => {
    cy.document().then((doc) => cy.spy(doc, 'execCommand').as('execCommand'));

    clickOnCopyValue();

    cy.get('@execCommand').should('have.been.calledOnceWith', 'copy');
  });
});
