/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { navigateTo } from '../../tasks/navigation';
import { ROLES } from '../../test';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';

describe('Reader - only READ', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';

  beforeEach(() => {
    login(ROLES.reader);
  });
  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
  });

  it('should not be able to add nor run saved queries', () => {
    navigateTo('/app/osquery/saved_queries');
    cy.waitForReact(1000);
    cy.contains(SAVED_QUERY_ID);
    cy.contains('Add saved query').should('be.disabled');
    cy.react('PlayButtonComponent', {
      props: { savedQuery: { attributes: { id: SAVED_QUERY_ID } } },
      options: { timeout: 3000 },
    }).should('not.exist');
    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    cy.react('EuiFormRow', { props: { label: 'ID' } })
      .getBySel('input')
      .should('be.disabled');
    cy.react('EuiFormRow', { props: { label: 'Description (optional)' } })
      .getBySel('input')
      .should('be.disabled');

    cy.contains('Update query').should('not.exist');
    cy.contains(`Delete query`).should('not.exist');
  });
  it('should not be able to enter live queries with just read and no run saved queries', () => {
    navigateTo('/app/osquery/live_queries/new');
    cy.waitForReact(1000);
    cy.contains('Permission denied');
  });
  it('should not be able to play in live queries history', () => {
    navigateTo('/app/osquery/live_queries');
    cy.waitForReact(1000);
    cy.contains('New live query').should('be.disabled');
    cy.contains('select * from uptime');
    cy.react('EuiIconPlay', { options: { timeout: 3000 } }).should('not.exist');
    cy.react('ActionTableResultsButton').should('exist');
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
});
