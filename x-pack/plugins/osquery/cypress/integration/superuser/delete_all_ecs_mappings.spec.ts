/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { login } from '../../tasks/login';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';

describe('SuperUser - Delete ECS Mappings', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';

  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
  });
  beforeEach(() => {
    login();
    navigateTo('/app/osquery/saved_queries');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
  });

  it('to click the edit button and edit pack', () => {
    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    cy.contains('Custom key/value pairs.').should('exist');
    cy.contains('Hours of uptime').should('exist');
    cy.react('EuiButtonIcon', { props: { id: 'labels-trash' } }).click();
    cy.react('EuiButton').contains('Update query').click();
    cy.wait(5000);

    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    cy.contains('Custom key/value pairs').should('not.exist');
    cy.contains('Hours of uptime').should('not.exist');
  });
});
