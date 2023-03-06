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
  addToCase,
  checkActionItemsInResults,
  checkResults,
  inputQuery,
  selectAllAgents,
  submitQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
  viewRecentCaseAndCheckResults,
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
    runKbnArchiverScript(ArchiverMethod.LOAD, 'case_security');
  });

  beforeEach(() => {
    login(ROLES.soc_manager);
    navigateTo('/app/osquery');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'ecs_mapping_1');
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'example_pack');
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'case_security');
  });

  it('should validate the form', () => {
    cy.contains('New live query').click();
    submitQuery();
    cy.contains('Agents is a required field');
    cy.contains('Query is a required field');
    selectAllAgents();
    inputQuery('select * from uptime; ');
    submitQuery();
    cy.contains('Agents is a required field').should('not.exist');
    cy.contains('Query is a required field').should('not.exist');
    checkResults();
    getAdvancedButton().click();
    typeInOsqueryFieldInput('days{downArrow}{enter}');
    submitQuery();
    cy.contains('ECS field is required.');
    typeInECSFieldInput('message{downArrow}{enter}');
    submitQuery();
    cy.contains('ECS field is required.').should('not.exist');

    checkResults();
    cy.react('Cell', { props: { columnIndex: 0 } })
      .should('exist')
      .first()
      .click();
    cy.url().should('include', 'app/fleet/agents/');
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
    checkActionItemsInResults({
      lens: true,
      discover: true,
      cases: true,
      timeline: false,
    });
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
    // cy.getReact('SavedQueriesDropdown').getCurrentState().should('have.length', 1); // TODO do we need it?
    inputQuery('{selectall}{backspace}select * from users;');
    cy.wait(1000);
    submitQuery();
    checkResults();
    navigateTo('/app/osquery');
    cy.react('EuiButtonIcon', { props: { iconType: 'play' } })
      .eq(0)
      .should('be.visible')
      .click();

    cy.react('ReactAce', { props: { value: 'select * from users;' } }).should('exist');
  });

  it('should open query details by clicking the details icon', () => {
    cy.react('EuiButtonIcon', { props: { iconType: 'visTable' } })
      .first()
      .click();
    cy.contains('Live query details');
    cy.contains('select * from users;');
  });

  it('should run live pack', () => {
    cy.contains('New live query').click();
    cy.contains('Run a set of queries in a pack.').click();
    cy.get(LIVE_QUERY_EDITOR).should('not.exist');
    cy.getBySel('select-live-pack').click().type('Example{downArrow}{enter}');
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
    checkActionItemsInResults({
      lens: true,
      discover: true,
      cases: true,
      timeline: false,
    });
    cy.contains('Status').click();
    cy.getBySel('tableHeaderCell_status_0').should('exist');
    cy.getBySel('tableHeaderCell_fields.agent_id[0]_1').should('exist');
    cy.getBySel('tableHeaderCell__source.action_response.osquery.count_2').should('exist');
    cy.getBySel('tableHeaderCell_fields.error[0]_3').should('exist');

    cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
    cy.getBySel('toggleIcon-failingQuery').click();
    cy.contains('Status').click();
    cy.contains('query failed, code: 1, message: no such table: opera_extensions');
    cy.getBySel('toggleIcon-failingQuery').click();
    cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
    addToCase();
    viewRecentCaseAndCheckResults();
  });

  it('should run multiline query', () => {
    const multilineQuery =
      'select u.username, {shift+enter}' +
      '       p.pid, {shift+enter}' +
      '       p.name, {shift+enter}' +
      '       pos.local_address, {shift+enter}' +
      '       pos.local_port, {shift+enter}' +
      '       p.path, {shift+enter}' +
      '       p.cmdline, {shift+enter}' +
      '       pos.remote_address, {shift+enter}' +
      '       pos.remote_port {shift+enter}' +
      'from processes as p{esc}{shift+enter}' +
      'join users as u{esc}{shift+enter}' +
      '    on u.uid=p.uid{esc}{shift+enter}' +
      'join process_open_sockets as pos{esc}{shift+enter}' +
      '    on pos.pid=p.pid{esc}{shift+enter}' +
      "where pos.remote_port !='0' {shift+enter}" +
      'limit 1000;';
    cy.contains('New live query').click();
    cy.react('ReactAce').invoke('height').and('be.gt', 99).and('be.lt', 110);
    cy.get(LIVE_QUERY_EDITOR).click().invoke('val', multilineQuery);

    inputQuery(multilineQuery);
    cy.wait(2000);
    cy.react('ReactAce').invoke('height').should('be.gt', 220).and('be.lt', 300);
    selectAllAgents();
    submitQuery();
    checkResults();

    // check if it get's bigger when we add more lines
    cy.react('ReactAce').invoke('height').should('be.gt', 220).and('be.lt', 300);
    inputQuery(multilineQuery);
    cy.wait(2000);
    cy.react('ReactAce').invoke('height').should('be.gt', 350).and('be.lt', 500);

    inputQuery('{selectall}{backspace}{selectall}{backspace}');
    cy.wait(2000);
    // not sure if this is how it used to work when I implemented the functionality, but let's leave it like this for now
    cy.react('ReactAce').invoke('height').should('be.gt', 350).and('be.lt', 500);
  });
});
