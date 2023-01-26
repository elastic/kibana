/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';

import { login } from '../../tasks/login';
import { ROLES } from '../../test';
import { getSavedQueriesComplexTest } from '../../tasks/saved_queries';
import { getRandomInt } from '../../tasks/helpers';

describe('ALL - Saved queries', () => {
  const randomNumber = getRandomInt();
  const SAVED_QUERY_ID = `Saved-Query-Id-${randomNumber}`;
  const SAVED_QUERY_DESCRIPTION = `Test saved query description ${randomNumber}`;

  beforeEach(() => {
    login(ROLES.soc_manager);
    navigateTo('/app/osquery');
  });

  getSavedQueriesComplexTest(SAVED_QUERY_ID, SAVED_QUERY_DESCRIPTION);

  it('checks default values on new saved query', () => {
    cy.contains('Saved queries').click();
    cy.contains('Add saved query').click();
    // ADD MORE FIELDS HERE
    cy.getBySel('resultsTypeField').within(() => {
      cy.contains('Snapshot');
    });
  });
  it('checks result type on prebuilt saved query', () => {
    cy.contains('Saved queries').click();
    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: 'users_elastic' } } },
    }).click();
    cy.getBySel('resultsTypeField').within(() => {
      cy.contains('Snapshot');
    });
  });
});
