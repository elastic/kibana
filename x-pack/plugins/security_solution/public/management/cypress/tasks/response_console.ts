/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeAllToasts } from './close_all_toasts';
import { APP_ENDPOINTS_PATH } from '../../../../common/constants';

export const waitForEndpointListPageToBeLoaded = (endpointHostname: string) => {
  cy.visit(APP_ENDPOINTS_PATH);
  closeAllToasts();
  cy.contains(endpointHostname).should('exist');
};
export const openResponseConsoleFromEndpointList = () => {
  cy.getByTestSubj('endpointTableRowActions').first().click();
  cy.contains('Respond').click();
};

export const inputConsoleCommand = (command: string) => {
  cy.getByTestSubj('endpointResponseActionsConsole-inputCapture').click().type(`${command}`);
};

export const clearConsoleCommandInput = () => {
  cy.getByTestSubj('endpointResponseActionsConsole-inputCapture')
    .click()
    .type(`{selectall}{backspace}`);
};

export const selectCommandFromHelpMenu = (command: string) => {
  cy.getByTestSubj('endpointResponseActionsConsole-header-helpButton').click();
  cy.getByTestSubj(
    `endpointResponseActionsConsole-commandList-Responseactions-${command}-addToInput`
  ).click();
};

export const checkInputForCommandPresence = (command: string) => {
  cy.getByTestSubj('endpointResponseActionsConsole-cmdInput-leftOfCursor')
    .invoke('text')
    .then((text) => text.trim())
    .should('eq', command);
};

export const submitCommand = () => {
  cy.getByTestSubj('endpointResponseActionsConsole-inputTextSubmitButton').click();
};

export const waitForCommandToBeExecuted = () => {
  cy.contains('Action pending.').should('exist');
  cy.contains('Action completed.', { timeout: 120000 }).should('exist');
};

export const performCommandInputChecks = (command: string) => {
  inputConsoleCommand(command);
  clearConsoleCommandInput();
  selectCommandFromHelpMenu(command);
  checkInputForCommandPresence(command);
};
