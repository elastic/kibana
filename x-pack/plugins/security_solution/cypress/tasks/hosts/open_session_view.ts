/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SESSION_VIEW_TAB,
  SESSION_TABLE_ROW_MORE_BUTTON,
  SESSION_TABLE_OPEN_SESSION_VIEW_TEXT,
} from '../../screens/session_view';
import { loginAndWaitForPage } from '../login';
import { HOSTS_URL } from '../../urls/navigation';

export const loginAndNavigateToHostSessions = () => {
  loginAndWaitForPage(HOSTS_URL);
  cy.get(SESSION_VIEW_TAB).click();
};

// Picks a session by eventId from session leader table and open session view
export const openSessionView = (eventId: string) => {
  // Open session view
  cy.get(SESSION_TABLE_ROW_MORE_BUTTON(eventId)).click();
  cy.contains(SESSION_TABLE_OPEN_SESSION_VIEW_TEXT).click();
};
