/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { navigateTo } from '../../tasks/navigation';
import { ROLES } from '../../test';
import { checkResults, selectAllAgents, submitQuery } from '../../tasks/live_query';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { getSavedQueriesDropdown, LIVE_QUERY_EDITOR } from '../../screens/live_query';

describe('T1 Analyst - READ + runSavedQueries ', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';

  beforeEach(() => {
    login(ROLES.t1_analyst);
  });
  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
  });

  it('should be able to run saved queries but not add new ones', () => {
    navigateTo('/app/osquery/saved_queries');
    cy.waitForReact(1000);
    cy.contains(SAVED_QUERY_ID);
    cy.contains('Add saved query').should('be.disabled');
    cy.react('PlayButtonComponent', {
      props: { savedQuery: { attributes: { id: SAVED_QUERY_ID } } },
    })
      .should('not.be.disabled')
      .click();
    selectAllAgents();
    cy.contains('select * from uptime;');
    submitQuery();
    checkResults();
    cy.contains('View in Discover').should('not.exist');
    cy.contains('View in Lens').should('not.exist');
  });
  it('should be able to play in live queries history', () => {
    navigateTo('/app/osquery/live_queries');
    cy.waitForReact(1000);
    cy.contains('New live query').should('not.be.disabled');
    cy.contains('select * from uptime');
    cy.wait(1000);
    cy.react('EuiTableBody').first().react('DefaultItemAction').first().click();
    selectAllAgents();
    cy.contains(SAVED_QUERY_ID);
    submitQuery();
    checkResults();
  });
  it('should be able to use saved query in a new query', () => {
    navigateTo('/app/osquery/live_queries');
    cy.waitForReact(1000);
    cy.contains('New live query').should('not.be.disabled').click();
    selectAllAgents();
    getSavedQueriesDropdown().click().type(`${SAVED_QUERY_ID}{downArrow} {enter}`);
    cy.contains('select * from uptime');
    submitQuery();
    checkResults();
  });
  it('should not be able to add nor edit packs', () => {
    const PACK_NAME = 'removing-pack';

    navigateTo('/app/osquery/packs');
    cy.waitForReact(1000);
    cy.contains('Add pack').should('be.disabled');
    cy.react('ActiveStateSwitchComponent', {
      props: { item: { attributes: { name: PACK_NAME } } },
    })
      .find('button')
      .should('be.disabled');
    cy.contains(PACK_NAME).click();
    cy.contains(`${PACK_NAME} details`);
    cy.contains('Edit').should('be.disabled');
    cy.react('CustomItemAction', {
      props: { index: 0, item: { id: SAVED_QUERY_ID } },
      options: { timeout: 3000 },
    }).should('not.exist');
    cy.react('CustomItemAction', {
      props: { index: 1, item: { id: SAVED_QUERY_ID } },
      options: { timeout: 3000 },
    }).should('not.exist');
  });
  it('should not be able to create new liveQuery from scratch', () => {
    navigateTo('/app/osquery');

    cy.contains('New live query').click();
    selectAllAgents();
    cy.get(LIVE_QUERY_EDITOR).should('not.exist');
    cy.contains('Submit').should('be.disabled');
  });
});
