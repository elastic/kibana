/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLE, login } from '../../tasks/login';
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
import {
  loadPack,
  loadSavedQuery,
  cleanupPack,
  cleanupCase,
  cleanupSavedQuery,
  loadCase,
} from '../../tasks/api_fixtures';

describe('ALL - Live Query', () => {
  let packId: string;
  let packName: string;
  let savedQueryId: string;
  let savedQueryName: string;
  let caseId: string;

  before(() => {
    loadPack({
      queries: {
        system_memory_linux_elastic: {
          ecs_mapping: {},
          interval: 3600,
          platform: 'linux',
          query: 'SELECT * FROM memory_info;',
        },
        system_info_elastic: {
          ecs_mapping: {},
          interval: 3600,
          platform: 'linux,windows,darwin',
          query: 'SELECT * FROM system_info;',
        },
        failingQuery: {
          ecs_mapping: {},
          interval: 10,
          query: 'select opera_extensions.* from users join opera_extensions using (uid);',
        },
      },
    }).then((pack) => {
      packId = pack.saved_object_id;
      packName = pack.name;
    });
    loadSavedQuery({
      interval: '3600',
      query: 'select * from uptime;',
      ecs_mapping: {},
    }).then((savedQuery) => {
      savedQueryId = savedQuery.saved_object_id;
      savedQueryName = savedQuery.name;
    });
    loadCase('securitySolution').then((caseInfo) => {
      caseId = caseInfo.id;
    });
  });

  beforeEach(() => {
    login(ROLE.soc_manager);
    navigateTo('/app/osquery');
  });

  after(() => {
    cleanupPack(packId);
    cleanupSavedQuery(savedQueryId);
    cleanupCase(caseId);
  });

  it('should validate the form', () => {
    cy.contains('New live query').click();
    submitQuery();
    cy.contains('Agents is a required field');
    cy.contains('Query is a required field');
    selectAllAgents();
    inputQuery('select * from uptime;');
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
    cy.react('Cell', { props: { colIndex: 0 } })
      .should('exist')
      .first()
      .click();
    cy.url().should('include', 'app/fleet/agents/');
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
    cy.react('SavedQueriesDropdown').type(`${savedQueryName}{downArrow}{enter}`);
    inputQuery('{selectall}{backspace}select * from users;');
    cy.wait(1000);
    submitQuery();
    checkResults();
    navigateTo('/app/osquery');
    cy.react('EuiButtonIcon', { props: { iconType: 'play' } })
      .eq(0)
      .should('be.visible')
      .click();

    cy.get(LIVE_QUERY_EDITOR).contains('select * from users;');
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
    cy.getBySel('select-live-pack').click().type(`${packName}{downArrow}{enter}`);
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
    addToCase(caseId);
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
    cy.get(LIVE_QUERY_EDITOR).invoke('height').and('be.gt', 99).and('be.lt', 110);
    cy.get(LIVE_QUERY_EDITOR).click().invoke('val', multilineQuery);

    inputQuery(multilineQuery);
    cy.get(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 220).and('be.lt', 300);
    selectAllAgents();
    submitQuery();
    cy.getBySel('osqueryResultsPanel');

    // check if it get's bigger when we add more lines
    cy.get(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 220).and('be.lt', 300);
    inputQuery(multilineQuery);
    cy.get(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 350).and('be.lt', 550);

    inputQuery('{selectall}{backspace}{selectall}{backspace}');
    // not sure if this is how it used to work when I implemented the functionality, but let's leave it like this for now
    cy.get(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 200).and('be.lt', 350);
  });
});
