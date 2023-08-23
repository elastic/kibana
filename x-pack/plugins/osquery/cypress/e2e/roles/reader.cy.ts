/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import { navigateTo } from '../../tasks/navigation';
import {
  cleanupPack,
  cleanupSavedQuery,
  loadLiveQuery,
  loadPack,
  loadSavedQuery,
} from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

describe('Reader - only READ', { tags: [tag.ESS] }, () => {
  let savedQueryName: string;
  let savedQueryId: string;
  let packName: string;
  let packId: string;
  let liveQueryQuery: string;

  before(() => {
    loadPack().then((data) => {
      packId = data.saved_object_id;
      packName = data.name;
    });
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
      savedQueryName = data.id;
    });
    loadLiveQuery().then((data) => {
      liveQueryQuery = data.queries?.[0].query;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.READER);
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
    cleanupPack(packId);
  });

  it('should not be able to add nor run saved queries', () => {
    navigateTo('/app/osquery/saved_queries');
    cy.waitForReact(1000);
    cy.contains(savedQueryName);
    cy.contains('Add saved query').should('be.disabled');
    cy.react('PlayButtonComponent', {
      props: { savedQuery: { id: savedQueryName } },
      options: { timeout: 3000 },
    }).should('not.exist');
    cy.react('CustomItemAction', {
      props: { index: 1, item: { id: savedQueryName } },
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
    cy.contains(liveQueryQuery);
    cy.react('EuiIconPlay', { options: { timeout: 3000 } }).should('not.exist');
    cy.react('ActionTableResultsButton').should('exist');
  });

  it('should not be able to add nor edit packs', () => {
    navigateTo('/app/osquery/packs');
    cy.waitForReact(1000);
    cy.contains('Add pack').should('be.disabled');
    cy.getBySel('tablePaginationPopoverButton').click();
    cy.getBySel('tablePagination-50-rows').click();
    cy.react('ActiveStateSwitchComponent', {
      props: { item: { name: packName } },
    })
      .find('button')
      .should('be.disabled');
    cy.contains(packName).click();
    cy.contains(`${packName} details`);
    cy.contains('Edit').should('be.disabled');
    // TODO: Verify assertions
    cy.react('CustomItemAction', {
      props: { index: 0, item: { id: savedQueryName } },
      options: { timeout: 3000 },
    }).should('not.exist');
    cy.react('CustomItemAction', {
      props: { index: 1, item: { id: savedQueryName } },
      options: { timeout: 3000 },
    }).should('not.exist');
  });
});
