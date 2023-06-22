/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLE, login } from '../../tasks/login';
import { navigateTo } from '../../tasks/navigation';
import {
  checkResults,
  selectAllAgents,
  submitQuery,
  inputQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
  checkActionItemsInResults,
} from '../../tasks/live_query';
import { getSavedQueriesComplexTest } from '../../tasks/saved_queries';
import { loadPack, loadSavedQuery, cleanupSavedQuery, cleanupPack } from '../../tasks/api_fixtures';

describe('T2 Analyst - READ + Write Live/Saved + runSavedQueries ', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';

  let savedQueryName: string;
  let savedQueryId: string;
  let packName: string;
  let packId: string;

  before(() => {
    loadPack().then((data) => {
      packId = data.id;
      packName = data.attributes.name;
    });
    loadSavedQuery().then((data) => {
      savedQueryId = data.id;
      savedQueryName = data.attributes.id;
    });
  });

  beforeEach(() => {
    login(ROLE.t2_analyst);
    navigateTo('/app/osquery');
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
    cleanupPack(packId);
  });

  getSavedQueriesComplexTest();

  it('should not be able to add nor edit packs', () => {
    navigateTo('/app/osquery/packs');
    cy.waitForReact(1000);
    cy.getBySel('tablePaginationPopoverButton').click();
    cy.getBySel('tablePagination-50-rows').click();
    cy.contains('Add pack').should('be.disabled');
    cy.react('ActiveStateSwitchComponent', {
      props: { item: { attributes: { name: packName } } },
    })
      .find('button')
      .should('be.disabled');
    cy.contains(packName).click();
    cy.contains(`${packName} details`);
    cy.contains('Edit').should('be.disabled');
    // TODO: fix
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
    inputQuery('select * from uptime;');
    cy.wait(500);
    // checking submit by clicking cmd+enter
    inputQuery(cmd);
    checkResults();
    checkActionItemsInResults({
      lens: false,
      discover: false,
      cases: true,
      timeline: false,
    });
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
    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: savedQueryName } } },
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
      props: { index: 1, item: { attributes: { id: savedQueryName } } },
    }).click();
    cy.contains('Custom key/value pairs').should('not.exist');
    cy.contains('Hours of uptime').should('not.exist');
  });
});
