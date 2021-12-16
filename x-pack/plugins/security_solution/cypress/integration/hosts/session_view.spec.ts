/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SESSION_TABLE,
  SESSION_VIEW_EMPTY_STATE,
  SESSION_TABLE_HEADER,
  SESSION_VIEW_CLOSE_BUTTON,
  PROCESS_TREE,
  PROCESS_TREE_NODE_ALERT,
  SEARCH_BAR,
  DETAILS_PANEL,
  DETAILS_PANEL_TOGGLE,
  DETAILS_PANEL_ALERT,
  DETAILS_PANEL_COMMAND,
  DETAILS_PANEL_SESSION,
  DETAILS_PANEL_SERVER,
  getProcessTreeNodeAlertDetailViewRule,
} from '../../screens/session_view';
import {
  loginAndNavigateToHostSessions,
  openSessionView,
} from '../../tasks/hosts/open_session_view';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

import { cleanKibana } from '../../tasks/common';

const tableHeaders = {
  '@timestamp': '@timestamp',
  'process.user.name': 'process.user.name',
  'event.kind': 'event.kind',
  'process.session.pid': 'process.session.pid',
  'process.args': 'process.args',
};

const TEST_EVENT_ID = 'cDLmwH0BLujk-6QxyflF';
const LS_TEST_COMMAND = 'ls --color=auto';
const ALERT_TEST_COMMAND = 'vi cmd/cmd.prj';
const ALERT_NODE_TEST_ID = getProcessTreeNodeAlertDetailViewRule(
  '64940663527c71b1f577df2aa529c42afc1c023108154714b49966e517e395b8'
);
const ALERT_RULE_ID = 'd9f45980-5e10-11ec-b7c6-17150991b0b3';

describe('Session view', () => {
  context('Rendering table empty state', () => {
    before(() => {
      cleanKibana();
    });

    it('shows the empty state', () => {
      loginAndNavigateToHostSessions();
      cy.get(SESSION_VIEW_EMPTY_STATE).should('be.visible');
    });
  });

  context('Rendering with data', () => {
    before(() => {
      cleanKibana();
      esArchiverLoad('session_view');
    });

    beforeEach(() => {
      loginAndNavigateToHostSessions();
    });

    after(() => {
      esArchiverUnload('session_view');
    });

    it('renders the session table', () => {
      // Check all columns expected exist
      Object.keys(tableHeaders).forEach((header: string) => {
        cy.get(SESSION_TABLE_HEADER(header)).should('be.visible');
      });

      openSessionView(TEST_EVENT_ID);

      // Check session view exists and come back to session leader table
      cy.get(PROCESS_TREE).should('be.visible');
      const closeSessionViewButton = cy.get(SESSION_VIEW_CLOSE_BUTTON);
      closeSessionViewButton.should('be.visible');
      closeSessionViewButton.click();

      cy.get(SESSION_TABLE).should('be.visible');
    });

    it('renders the session view', () => {
      openSessionView(TEST_EVENT_ID);

      // Checking Search bar exist
      cy.get(SEARCH_BAR).should('be.visible');

      // Check detail panel and its toggle work correctly
      cy.get(DETAILS_PANEL).should('not.exist');
      // Checking Details panel exist
      cy.get(DETAILS_PANEL_TOGGLE).click();
      cy.get(DETAILS_PANEL).should('be.visible');

      // Only Session, Server Detail exist when no commands selected when detail panel is open
      cy.get(DETAILS_PANEL_ALERT).should('not.exist');
      cy.get(DETAILS_PANEL_COMMAND).should('not.exist');
      cy.get(DETAILS_PANEL_SESSION).should('be.visible');
      cy.get(DETAILS_PANEL_SERVER).should('exist');

      const lsCommandNode = cy.contains(LS_TEST_COMMAND);
      lsCommandNode.should('exist');
      lsCommandNode.click();
      // Checking Command, Session, Server Detail exist for a command without alert
      cy.get(DETAILS_PANEL_ALERT).should('not.exist');
      cy.get(DETAILS_PANEL_COMMAND).should('be.visible');
      cy.get(DETAILS_PANEL_SESSION).should('exist');
      cy.get(DETAILS_PANEL_SERVER).should('exist');

      const viCommand = cy.contains(ALERT_TEST_COMMAND);
      viCommand.should('be.visible');
      viCommand.click();
      // Checking Command, Session, Server, Alert Detail exist
      cy.get(DETAILS_PANEL_ALERT).should('exist');
      cy.get(DETAILS_PANEL_COMMAND).should('be.visible');
      cy.get(DETAILS_PANEL_SESSION).should('exist');
      cy.get(DETAILS_PANEL_SERVER).should('exist');
    });

    it('renders alert details correctly', () => {
      openSessionView(TEST_EVENT_ID);

      cy.get(PROCESS_TREE_NODE_ALERT).first().click();
      cy.get(ALERT_NODE_TEST_ID).first().click();
      cy.location('pathname').should('contain', `app/security/rules/id/${ALERT_RULE_ID}`);
    });
  });
});
