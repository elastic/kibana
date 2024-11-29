/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import type { ConsoleResponseActionCommands } from '../../../../common/endpoint/service/response_actions/constants';
import { DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP } from '../../../../common/test';

const TEST_SUBJ = Object.freeze({
  responderPage: 'consolePageOverlay',
  actionLogFlyout: 'responderActionLogFlyout',
});

export const getConsoleHelpPanelResponseActionTestSubj = (): Record<
  ConsoleResponseActionCommands,
  string
> => {
  return {
    isolate: 'endpointResponseActionsConsole-commandList-Responseactions-isolate',
    release: 'endpointResponseActionsConsole-commandList-Responseactions-release',
    processes: 'endpointResponseActionsConsole-commandList-Responseactions-processes',
    'kill-process': 'endpointResponseActionsConsole-commandList-Responseactions-kill-process',
    'suspend-process': 'endpointResponseActionsConsole-commandList-Responseactions-suspend-process',
    'get-file': 'endpointResponseActionsConsole-commandList-Responseactions-get-file',
    execute: 'endpointResponseActionsConsole-commandList-Responseactions-execute',
    upload: 'endpointResponseActionsConsole-commandList-Responseactions-upload',
    scan: 'endpointResponseActionsConsole-commandList-Responseactions-scan',
    // runscript: 'endpointResponseActionsConsole-commandList-Responseactions-runscript',
  };
};

export const ensureOnResponder = (): Cypress.Chainable<JQuery<HTMLDivElement>> => {
  return cy.getByTestSubj<HTMLDivElement>(TEST_SUBJ.responderPage).should('exist');
};

export const closeResponder = (): void => {
  ensureOnResponder();
  cy.getByTestSubj('consolePageOverlay-header-back-link').click();
  cy.getByTestSubj(TEST_SUBJ.responderPage, { timeout: 1000 }).should('not.exist');
};

export const openResponderActionLogFlyout = (): void => {
  ensureOnResponder();
  cy.getByTestSubj('responderShowActionLogButton').click();
  cy.getByTestSubj(TEST_SUBJ.actionLogFlyout).should('exist');
};

export const closeResponderActionLogFlyout = (): void => {
  ensureOnResponder();
  cy.getByTestSubj(TEST_SUBJ.actionLogFlyout).then((flyout) => {
    // If It's open, then close it
    if (flyout.length) {
      cy.get(testSubjSelector(TEST_SUBJ.actionLogFlyout))
        .findByTestSubj('euiFlyoutCloseButton')
        .click();
      cy.getByTestSubj(TEST_SUBJ.actionLogFlyout).should('not.exist');
    }
  });
};

export const openResponderActionLogDatePickerQuickMenu = (): void => {
  ensureOnResponder();
  cy.getByTestSubj(TEST_SUBJ.actionLogFlyout)
    .findByTestSubj('superDatePickerToggleQuickMenuButton')
    .click();

  cy.getByTestSubj('superDatePickerQuickMenu').should('exist');
};

export const setResponderActionLogDateRange = (
  range: keyof typeof DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP = 'Last 7 days'
): void => {
  ensureOnResponder();
  openResponderActionLogDatePickerQuickMenu();
  cy.getByTestSubj(DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP[range]).click();
  cy.getByTestSubj('superDatePickerQuickMenu').should('not.exist');
};

export const openConsoleHelpPanel = (): Cypress.Chainable => {
  ensureOnResponder();
  return cy.getByTestSubj('endpointResponseActionsConsole-header-helpButton').click();
};
