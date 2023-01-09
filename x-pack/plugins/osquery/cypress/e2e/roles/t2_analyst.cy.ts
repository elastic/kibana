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
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
} from '../../tasks/live_query';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';

describe('T2 Analyst - READ + Write Live/Saved + runSavedQueries ', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';
  // const randomNumber = getRandomInt();
  //
  // const NEW_SAVED_QUERY_ID = `Saved-Query-Id-${randomNumber}`;
  // const NEW_SAVED_QUERY_DESCRIPTION = `Test saved query description ${randomNumber}`;
  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
  });

  beforeEach(() => {
    login(ROLES.t2_analyst);
    navigateTo('/app/osquery');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
  });

  // TODO unskip after FF
  // getSavedQueriesComplexTest(NEW_SAVED_QUERY_ID, NEW_SAVED_QUERY_DESCRIPTION);

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

  it('should run query and enable ecs mapping', () => {
    const cmd = Cypress.platform === 'darwin' ? '{meta}{enter}' : '{ctrl}{enter}';
    cy.contains('New live query').click();
    selectAllAgents();
    inputQuery('select * from uptime; ');
    cy.wait(500);
    // checking submit by clicking cmd+enter
    inputQuery(cmd);
    checkResults();
    cy.contains('View in Discover').should('not.exist');
    cy.contains('View in Lens').should('not.exist');
    cy.react('EuiDataGridHeaderCellWrapper', {
      props: { id: 'osquery.days.number', index: 1 },
    }).should('exist');
    cy.react('EuiDataGridHeaderCellWrapper', {
      props: { id: 'osquery.hours.number', index: 2 },
    }).should('exist');

    cy.react('EuiAccordionClass', { props: { buttonContent: 'Advanced' } })
      .last()
      .click();
    typeInECSFieldInput('message{downArrow}{enter}');
    typeInOsqueryFieldInput('days{downArrow}{enter}');
    submitQuery();

    checkResults();
    cy.react('EuiDataGridHeaderCellWrapper', {
      props: { id: 'message', index: 1 },
    }).should('exist');
    cy.react('EuiDataGridHeaderCellWrapper', {
      props: { id: 'osquery.days.number', index: 2 },
    }).within(() => {
      cy.get('.euiToolTipAnchor').within(() => {
        cy.get('svg').should('exist');
      });
    });
  });

  it('to click the edit button and edit pack', () => {
    navigateTo('/app/osquery/saved_queries');
    cy.getBySel('pagination-button-next').click();

    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    cy.contains('Custom key/value pairs.').should('exist');
    cy.contains('Hours of uptime').should('exist');
    cy.get('[data-test-subj="ECSMappingEditorForm"]')
      .first()
      .within(() => {
        cy.react('EuiButtonIcon', { props: { iconType: 'trash' } }).click();
      });
    cy.react('EuiButton').contains('Update query').click();
    cy.wait(5000);

    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    cy.contains('Custom key/value pairs').should('not.exist');
    cy.contains('Hours of uptime').should('not.exist');
  });
});
