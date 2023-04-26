/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';

import {
  NEW_INDEX_PAGE,
  NEW_INDEX_CARD,
  CRAWLER_INDEX,
  INDEX_OVERVIEW,
  ROUTES,
  getIndexRoute,
} from './selectors';

describe('Enterprise Search Crawler', () => {
  it('test', () => {
    login();
    cy.visit(ROUTES.NEW_INDEX);

    // TODO check if it actually sees svg
    // make sure card is selected by checking checkmark is in
    cy.getBySel(NEW_INDEX_CARD.SELECT_CRAWLER).find('svg');

    // continue to the new Crawler Index page
    cy.getBySel(NEW_INDEX_PAGE.continueButton).click();

    // we are in correct route
    cy.url().should('contain', ROUTES.NEW_INDEX);

    cy.getBySel(CRAWLER_INDEX.CREATE_BUTTON).should('be.disabled');

    const indexName = 'cypress-crawler-' + Math.random();
    // type new name
    cy.getBySel(CRAWLER_INDEX.INDEX_NAME_INPUT).type(indexName);

    // create index
    cy.getBySel(CRAWLER_INDEX.CREATE_BUTTON).click();

    // make sure we are in new index
    cy.url().should('contain', getIndexRoute(indexName) + 'domain_management');

    // go to overview tab
    cy.getBySel(INDEX_OVERVIEW.TABS.OVERVIEW).click();

    cy.get('main header h1').should('contain.text', indexName);
    // check Ingestion Type stat is Crawler
    cy.getBySel(INDEX_OVERVIEW.STATS.INGESTION_TYPE).should('contain.text', 'Crawler');
  });
});
