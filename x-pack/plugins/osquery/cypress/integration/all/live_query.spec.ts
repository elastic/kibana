/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { login } from '../../tasks/login';
import { navigateTo } from '../../tasks/navigation';
import {
  checkResults,
  inputQuery,
  selectAllAgents,
  submitQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
} from '../../tasks/live_query';
import {
  LIVE_QUERY_EDITOR,
  RESULTS_TABLE,
  RESULTS_TABLE_BUTTON,
  RESULTS_TABLE_CELL_WRRAPER,
} from '../../screens/live_query';
import { getAdvancedButton } from '../../screens/integrations';
import { ROLES } from '../../test';

describe('ALL - Live Query', () => {
  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'ecs_mapping_1');
    runKbnArchiverScript(ArchiverMethod.LOAD, 'example_pack');
  });

  beforeEach(() => {
    login(ROLES.soc_manager);
    navigateTo('/app/osquery');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'ecs_mapping_1');
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'example_pack');
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
    cy.contains('View in Discover').should('exist');
    cy.contains('View in Lens').should('exist');
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'osquery.days.number', index: 1 },
    }).should('exist');
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'osquery.hours.number', index: 2 },
    }).should('exist');

    getAdvancedButton().click();
    typeInECSFieldInput('message{downArrow}{enter}');
    typeInOsqueryFieldInput('days{downArrow}{enter}');
    submitQuery();

    checkResults();
    cy.getBySel(RESULTS_TABLE).within(() => {
      cy.getBySel(RESULTS_TABLE_BUTTON).should('exist');
    });
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'message', index: 1 },
    }).should('exist');
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'osquery.days.number', index: 2 },
    })
      .react('EuiIconTip', { props: { type: 'indexMapping' } })
      .should('exist');
  });

  it('should run customized saved query', () => {
    cy.contains('New live query').click();
    selectAllAgents();
    cy.react('SavedQueriesDropdown').type('NOMAPPING{downArrow}{enter}');
    cy.getReact('SavedQueriesDropdown').getCurrentState().should('have.length', 1);
    inputQuery('{selectall}{backspace}{selectall}{backspace}select * from users');
    cy.wait(1000);
    submitQuery();
    checkResults();
    navigateTo('/app/osquery');
    cy.react('EuiButtonIcon', { props: { iconType: 'play' } })
      .eq(0)
      .should('be.visible')
      .click();

    cy.react('ReactAce', { props: { value: 'select * from users' } }).should('exist');
  });

  it('should run live pack', () => {
    cy.contains('New live query').click();
    cy.contains('Run a set of queries in a pack.').click();
    cy.get(LIVE_QUERY_EDITOR).should('not.exist');
    cy.getBySel('select-live-pack').click();
    cy.contains('Example').click();
    cy.contains('This table contains 3 rows.');
    cy.contains('system_memory_linux_elastic');
    cy.contains('system_info_elastic');
    cy.contains('failingQuery');
    selectAllAgents();
    submitQuery();
    cy.getBySel('live-query-loading').should('exist');
    cy.getBySel('live-query-loading', { timeout: 10000 }).should('not.exist');
    cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
    checkResults();
    cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
    cy.getBySel('toggleIcon-failingQuery').click();
    cy.contains('Status').click();
    cy.contains('query failed, code: 1, message: no such table: opera_extensions');
    navigateTo('/app/osquery');
    cy.contains('Example');
  });
});
