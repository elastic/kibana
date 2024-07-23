/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleResponseActionCommands } from '../../../../common/endpoint/service/response_actions/constants';
import { closeAllToasts } from './toasts';
import { APP_ENDPOINTS_PATH } from '../../../../common/constants';
import { loadPage } from './common';
import Chainable = Cypress.Chainable;

export const waitForEndpointListPageToBeLoaded = (endpointHostname: string): void => {
  loadPage(APP_ENDPOINTS_PATH);
  closeAllToasts();
  cy.contains(endpointHostname).should('exist');
};
export const openResponseConsoleFromEndpointList = (): void => {
  cy.getByTestSubj('endpointTableRowActions').first().click();
  cy.contains('Respond').click();
};

export const inputConsoleCommand = (command: string): void => {
  cy.getByTestSubj('endpointResponseActionsConsole-inputCapture').type(command);
};

export const clearConsoleCommandInput = (): void => {
  cy.getByTestSubj('endpointResponseActionsConsole-inputCapture').type(`{selectall}{backspace}`);
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

export const waitForCommandToBeExecuted = (command: ConsoleResponseActionCommands): void => {
  let actionResultMessage = 'Action completed.';

  if (command === 'execute') {
    actionResultMessage = 'Command execution was successful';
  } else if (command === 'get-file') {
    actionResultMessage = 'File retrieved from the host.';
  } else if (command === 'scan') {
    actionResultMessage = 'Scan complete';
  }

  const actionPendingMessage =
    command === 'get-file' ? 'Retrieving the file from host.' : 'Action pending.';
  cy.contains(actionPendingMessage).should('exist');
  cy.contains(actionResultMessage, { timeout: 120000 }).should('exist');
};

export const performCommandInputChecks = (command: string) => {
  inputConsoleCommand(command);
  clearConsoleCommandInput();
  selectCommandFromHelpMenu(command);
  checkInputForCommandPresence(command);
};

export const checkReturnedProcessesTable = (): Chainable<JQuery<HTMLTableRowElement>> => {
  ['USER', 'PID', 'ENTITY ID', 'COMMAND'].forEach((header) => {
    cy.contains(header);
  });

  return cy
    .get('tbody')
    .find('tr')
    .then((rows) => {
      expect(rows.length).to.be.greaterThan(0);
    });
};
