/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { navigateTo } from '../../tasks/navigation';
import { ROLES } from '../../test';
import {
  checkResults,
  selectAllAgents,
  submitQuery,
  inputQuery,
  findFormFieldByRowsLabelAndType,
  deleteAndConfirm,
} from '../../tasks/live_query';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';

describe('T2 Analyst - READ + Write Live/Saved + runSavedQueries ', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';
  const SAVED_QUERY_DESCRIPTION = 'Test saved query description';

  beforeEach(() => {
    login(ROLES.t2_analyst);
    navigateTo('/app/osquery');
  });
  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
  });

  it(
    'should create a new query and verify: \n ' +
      '- query can viewed (status), edited and deleted ',
    () => {
      cy.contains('New live query').click();
      selectAllAgents();
      inputQuery('select * from uptime;');
      submitQuery();
      checkResults();

      // play saved query
      cy.contains('Saved queries').click();
      cy.contains(SAVED_QUERY_ID);
      cy.contains('Add saved query').should('not.be.disabled');
      cy.react('PlayButtonComponent', {
        props: { savedQuery: { attributes: { id: SAVED_QUERY_ID } } },
      }).click();
      selectAllAgents();
      submitQuery();

      // edit saved query
      cy.contains('Saved queries').click();
      cy.contains(SAVED_QUERY_ID);
      cy.react('CustomItemAction', {
        props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
      }).click();
      findFormFieldByRowsLabelAndType('Description (optional)', ' Edited');
      cy.react('EuiButton').contains('Update query').click();
      cy.contains(`${SAVED_QUERY_DESCRIPTION} Edited`);

      // delete saved query
      cy.contains(SAVED_QUERY_ID);
      cy.react('CustomItemAction', {
        props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
      }).click();
      deleteAndConfirm('query');
      cy.contains(SAVED_QUERY_ID);
      cy.contains(/^No items found/);
    }
  );
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
  });
});
