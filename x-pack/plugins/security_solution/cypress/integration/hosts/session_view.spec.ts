/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SESSION_VIEW_TAB,
  SESSION_TABLE,
  SESSION_VIEW_EMPTY_STATE,
  SESSION_TABLE_HEADER,
  SESSION_TABLE_HEADER_ACTIONS,
  SESSION_TABLE_ROW_CONTROL,
  SESSION_TABLE_ROW_MORE_BUTTON,
  SESSION_TABLE_OPEN_SESSION_VIEW_TEXT,
  SESSION_VIEW,
  SESSION_VIEW_CLOSE_BUTTON,
} from '../../screens/session_view';
import { loginAndWaitForPage } from '../../tasks/login';

import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';

import { HOSTS_URL } from '../../urls/navigation';
import { cleanKibana } from '../../tasks/common';

const tableHeaders = {
  '@timestamp': '@timestamp',
  'process.user.name': 'process.user.name',
  'event.kind': 'event.kind',
  'process.session.pid': 'process.session.pid',
  'process.args': 'process.args',
};

const TEST_EVENT_ID = '-uzVuX0B84daBUsy5lF8';

describe('Session view', () => {
  context('Rendering empty state', () => {
    before(() => {
      cleanKibana();
    });

    it('shows the empty state', () => {
      loginAndWaitForPage(HOSTS_URL);
      cy.get(SESSION_VIEW_TAB).click();
      cy.get(SESSION_VIEW_EMPTY_STATE).should('be.visible');
    });
  });

  context('Rendering with data', () => {
    before(() => {
      cleanKibana();
      esArchiverLoad('session_view');
    });

    beforeEach(() => {
      loginAndWaitForPage(HOSTS_URL);
      cy.get(SESSION_VIEW_TAB).click();
    });

    after(() => {
      esArchiverUnload('session_view');
    });

    it('renders the session table', () => {
      // Check all columns expected exist
      Object.keys(tableHeaders).forEach((header: string) => {
        cy.get(SESSION_TABLE_HEADER(header)).should('be.visible');
      });

      // Open session view
      cy.get(SESSION_TABLE_ROW_MORE_BUTTON(TEST_EVENT_ID)).click();
      cy.contains(SESSION_TABLE_OPEN_SESSION_VIEW_TEXT).click();

      // Check session view exists and come back to session leader table
      cy.get(SESSION_VIEW).should('be.visible');
      const closeSessionViewButton = cy.get(SESSION_VIEW_CLOSE_BUTTON);
      closeSessionViewButton.should('be.visible');
      closeSessionViewButton.click();

      cy.get(SESSION_TABLE).should('be.visible');
    });
  });
});
