/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ADD_TO_TIMELINE,
  CLOSE_TOP_N,
  COPY,
  EXPAND_OVERFLOW_ITEMS,
  FILTER_IN,
  FILTER_OUT,
  SHOW_TOP_FIELD,
  TOP_N_CONTAINER,
} from '../../screens/network/flows';
import { TOASTER } from '../../screens/configure_cases';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../../screens/search_bar';
import { DATA_PROVIDERS } from '../../screens/timeline';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';
import { NETWORK_URL } from '../../urls/navigation';
import { TIMELINE_TOGGLE_BUTTON } from '../../screens/security_main';

const testDomain = 'endpoint-dev-es.app.elstc.co';

describe('hover actions', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(NETWORK_URL);
    cy.get(TOASTER).should('not.exist', { timeout: 12000 }); // Wait until "Your browser does not meet the security requirements for Kibana." toaster goes away
    cy.get(EXPAND_OVERFLOW_ITEMS).click({ scrollBehavior: 'center' });
  });

  it('Adds global filter - filter in', () => {
    cy.get(FILTER_IN).first().click();

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('have.text', `destination.domain: ${testDomain}`);
  });

  it('Adds global filter - filter out', () => {
    cy.get(FILTER_OUT).first().click();

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
      'contains.text',
      `NOT destination.domain: ${testDomain}`
    );
  });

  it('Adds to timeline', () => {
    cy.get(ADD_TO_TIMELINE).first().click();

    cy.get(TIMELINE_TOGGLE_BUTTON).filter(':visible').trigger('click');

    cy.get(DATA_PROVIDERS).should('have.length', 1);
    cy.get(DATA_PROVIDERS)
      .invoke('text')
      .then((value) => {
        expect(value).to.eq(`destination.domain: ${testDomain}`);
      });
  });

  it('Show topN', () => {
    cy.get(SHOW_TOP_FIELD).first().click();

    cy.get(TOP_N_CONTAINER).should('exist').should('contain.text', 'Top destination.domain');

    cy.get(CLOSE_TOP_N).click();
  });

  it('Copy value', () => {
    cy.document().then((doc) => cy.spy(doc, 'execCommand').as('execCommand'));

    cy.get(COPY).first().invoke('focus').trigger('click', { force: true });

    cy.get('@execCommand').should('have.been.calledOnceWith', 'copy');
  });
});
