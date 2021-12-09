/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loginAndWaitForPage } from '../tasks/login';
import { SESSION_VIEW_URL } from '../urls/navigation';
import { cleanKibana } from '../tasks/common';
import { esArchiverLoad } from '../tasks/es_archiver';
import {
  PROCESS_TREE,
  PROCESS_TREE_NODE,
  PROCESS_TREE_NODE_ALERT,
  DETAILS_PANEL,
  DETAILS_PANEL_TOGGLE,
  DETAILS_PANEL_ALERT,
  DETAILS_PANEL_COMMAND,
  DETAILS_PANEL_SESSION,
  DETAILS_PANEL_SERVER,
  SEARCH_BAR,
  getProcessTreeNodeAlertDetailViewRule,
} from '../screens/common/page';

const LS_TEST_COMMAND = 'ls --color=auto';
const ALERT_TEST_COMMAND = 'vi EventConverter/package.json';
const ALERT_NODE_TEST_ID = getProcessTreeNodeAlertDetailViewRule(
  '1900f4bb07c6fcc64eb754ed97a83a952aa7698eaffe14749709e83f7b6bdb0d'
);
const ALERT_RULE_ID = '15b43080-5204-11ec-a8f5-f507bc52c10c';

describe('Display session view test page', () => {
  beforeEach(() => {
    cleanKibana();
    esArchiverLoad('sessions');
    loginAndWaitForPage(SESSION_VIEW_URL);
  });

  it('General Layout for Session View', () => {
    loginAndWaitForPage(SESSION_VIEW_URL);
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

    const lsCommandNode = cy.get(`${PROCESS_TREE} ${PROCESS_TREE_NODE}`).eq(1);
    lsCommandNode.contains(LS_TEST_COMMAND).should('be.visible');
    lsCommandNode.click();
    // Checking Command, Session, Server Detail exist for a command without alert
    cy.get(DETAILS_PANEL_ALERT).should('not.exist');
    cy.get(DETAILS_PANEL_COMMAND).should('be.visible');
    cy.get(DETAILS_PANEL_SESSION).should('exist');
    cy.get(DETAILS_PANEL_SERVER).should('exist');

    const viCommand = cy.get(`${PROCESS_TREE} ${PROCESS_TREE_NODE}`).eq(3);
    viCommand.contains(ALERT_TEST_COMMAND).should('be.visible');
    viCommand.click();
    // Checking Command, Session, Server, Alert Detail exist
    cy.get(DETAILS_PANEL_ALERT).should('exist');
    cy.get(DETAILS_PANEL_COMMAND).should('be.visible');
    cy.get(DETAILS_PANEL_SESSION).should('exist');
    cy.get(DETAILS_PANEL_SERVER).should('exist');
  });

  // it('Search Functionality', () => {
  //   loginAndWaitForPage(SESSION_VIEW_URL);
  //   cy.contains('Process Tree').click().wait(1000);
  //   // STILL NEED TO FIX THIS PART
  //   cy.get(SEARCH_BAR).last().click().type('ls{enter}');
  //   cy.get('span[style="[object Object]]').first().should('be.visible');
  // });

  it('Alerts Check', () => {
    loginAndWaitForPage(SESSION_VIEW_URL);
    cy.get(PROCESS_TREE_NODE_ALERT).first().click();
    cy.get(ALERT_NODE_TEST_ID).first().click();
    cy.location('pathname').should('contain', `app/security/rules/id/${ALERT_RULE_ID}`);
  });
});
