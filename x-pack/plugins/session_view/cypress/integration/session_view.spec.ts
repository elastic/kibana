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
import { DETAILS_PANEL, DETAILS_PANEL_TOGGLE, SEARCH_BAR } from '../screens/common/page';

describe('Display session view test page', () => {
  beforeEach(() => {
    cleanKibana();
    esArchiverLoad('sessions');
    loginAndWaitForPage(SESSION_VIEW_URL);
  });

  it('General Layout for Session View', () => {
    loginAndWaitForPage(SESSION_VIEW_URL);
    cy.contains('Process Tree').click().wait(1000);
    // Checking Search bar exist
    cy.get(SEARCH_BAR).should('be.visible');
    // Making sure commands from POST curl shows up
    cy.contains('ls --color=auto').click();
    // Checking Details panel exist
    cy.get(DETAILS_PANEL_TOGGLE).contains('Detail panel').click();
    // Checking Command, Session, Server Detail exist
    cy.get(DETAILS_PANEL).contains('Command detail');
    cy.get(DETAILS_PANEL).contains('Session detail');
    cy.get(DETAILS_PANEL).contains('Server detail');

    cy.contains('vi EventConverter/package.json').click();
    // Checking Command, Session, Server, Alert Detail exist
    cy.get(DETAILS_PANEL).contains('Command detail');
    cy.get(DETAILS_PANEL).contains('Session detail');
    cy.get(DETAILS_PANEL).contains('Server detail');
    cy.get(DETAILS_PANEL).contains('Alert detail');
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
    cy.contains('Process Tree').click().wait(1000);
    cy.contains('Alerts').first().click();
    cy.contains('View rule').first().click();
    cy.location('pathname').should(
      'contain',
      'app/security/rules/id/15b43080-5204-11ec-a8f5-f507bc52c10c'
    );
  });
});
