/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeAllToasts } from './close_all_toasts';
import { APP_ENDPOINTS_PATH } from '../../../../common/constants';

export const waitForEndpointListPageToBeLoaded = (endpointHostname: string): void => {
  cy.visit(APP_ENDPOINTS_PATH);
  closeAllToasts();
  cy.contains(endpointHostname).should('exist');
};
export const openResponseConsoleFromEndpointList = (): void => {
  cy.getByTestSubj('endpointTableRowActions').first().click();
  cy.contains('Respond').click();
};

export const inputConsoleCommand = (command: string): void => {
  cy.getByTestSubj('endpointResponseActionsConsole-inputCapture').click().type(command);
};

export const clearConsoleCommandInput = (): void => {
  cy.getByTestSubj('endpointResponseActionsConsole-inputCapture')
    .click()
    .type(`{selectall}{backspace}`);
};

export const selectCommandFromHelpMenu = (command: string): void => {
  cy.getByTestSubj('endpointResponseActionsConsole-header-helpButton').click();
  cy.getByTestSubj(
    `endpointResponseActionsConsole-commandList-Responseactions-${command}-addToInput`
  ).click();
};

export const checkInputForCommandPresence = (command: string): void => {
  cy.getByTestSubj('endpointResponseActionsConsole-cmdInput-leftOfCursor')
    .invoke('text')
    .should('eq', `${command} `); // command in the cli input is followed by a space
};

export const submitCommand = (): void => {
  cy.getByTestSubj('endpointResponseActionsConsole-inputTextSubmitButton').click();
};

export const waitForCommandToBeExecuted = (): void => {
  cy.contains('Action pending.').should('exist');
  cy.contains('Action completed.', { timeout: 120000 }).should('exist');
};

export const performCommandInputChecks = (command: string) => {
  inputConsoleCommand(command);
  clearConsoleCommandInput();
  selectCommandFromHelpMenu(command);
  checkInputForCommandPresence(command);
};
