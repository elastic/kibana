/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inputConsoleCommand, submitCommand } from './response_console';
import type { UserAuthzAccessLevel } from '../screens';
import { loadPage, request } from './common';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import {
  ACTION_DETAILS_ROUTE,
  EXECUTE_ROUTE,
  GET_FILE_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  SCAN_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
  UPLOAD_ROUTE,
} from '../../../../common/endpoint/constants';
import type { ActionDetails, ActionDetailsApiResponse } from '../../../../common/endpoint/types';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import { ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS } from '../../../../common/endpoint/service/response_actions/constants';

export const validateAvailableCommands = () => {
  // TODO: TC- use ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS when we go GA with automated process actions
  const config = Cypress.config();
  const automatedActionsPAttern = /automatedProcessActionsEnabled/;
  const automatedProcessActionsEnabled =
    config.env.ftrConfig.kbnServerArgs[0].match(automatedActionsPAttern);

  const enabledActions = [
    ...ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS,
    ...(automatedProcessActionsEnabled ? ['kill-process', 'suspend-process'] : []),
  ];

  cy.get('[data-test-subj^="command-type"]').should('have.length', enabledActions.length);
  enabledActions.forEach((command) => {
    cy.getByTestSubj(`command-type-${command}`);
  });
};
export const selectIsolateAndSaveWithoutEnabling = (ruleName: string) => {
  cy.getByTestSubj(`command-type-isolate`).click();
  cy.getByTestSubj('create-enabled-false').click();
  cy.contains(`${ruleName} was created`);
};

export const addEndpointResponseAction = () => {
  cy.getByTestSubj('response-actions-wrapper').within(() => {
    cy.getByTestSubj('Elastic Defend-response-action-type-selection-option').click();
  });
};
export const focusAndOpenCommandDropdown = (number = 0) => {
  cy.getByTestSubj(`response-actions-list-item-${number}`).within(() => {
    cy.getByTestSubj('input').type(`example${number}`);
    cy.getByTestSubj('commandTypeField').click();
  });
};
export const fillUpNewRule = (name = 'Test', description = 'Test') => {
  loadPage('app/security/rules/management');
  cy.getByTestSubj('create-new-rule').click();
  cy.getByTestSubj('stepDefineRule').within(() => {
    cy.getByTestSubj('queryInput').first().type('_id:*{enter}');
  });
  cy.getByTestSubj('define-continue').click();
  cy.getByTestSubj('detectionEngineStepAboutRuleName').within(() => {
    cy.getByTestSubj('input').type(name);
  });
  cy.getByTestSubj('detectionEngineStepAboutRuleDescription').within(() => {
    cy.getByTestSubj('input').type(description);
  });
  cy.getByTestSubj('about-continue').click();
  cy.getByTestSubj('schedule-continue').click();
};
export const fillUpNewEsqlRule = (name = 'Test', description = 'Test', query: string) => {
  loadPage('app/security/rules/management');
  cy.getByTestSubj('create-new-rule').click();
  cy.getByTestSubj('stepDefineRule').within(() => {
    cy.getByTestSubj('esqlRuleType').click();
    cy.getByTestSubj('detectionEngineStepDefineRuleEsqlQueryBar').within(() => {
      cy.getByTestSubj('globalQueryBar').click();
      cy.getByTestSubj('kibanaCodeEditor').type(query);
    });
  });
  cy.getByTestSubj('define-continue').click();
  cy.getByTestSubj('detectionEngineStepAboutRuleName').within(() => {
    cy.getByTestSubj('input').type(name);
  });
  cy.getByTestSubj('detectionEngineStepAboutRuleDescription').within(() => {
    cy.getByTestSubj('input').type(description);
  });
  cy.getByTestSubj('about-continue').click();
  cy.getByTestSubj('schedule-continue').click();
};
export const visitRuleActions = (ruleId: string) => {
  loadPage(`app/security/rules/id/${ruleId}/edit`);
  cy.getByTestSubj('edit-rule-actions-tab').should('exist');
  cy.getByTestSubj('globalLoadingIndicator').should('not.exist');
  cy.getByTestSubj('stepPanelProgress').should('not.exist');
};

export const getRunningProcesses = (command: string): Cypress.Chainable<number> => {
  inputConsoleCommand('processes');
  submitCommand();
  cy.contains('Action pending.').should('exist');

  // on success
  // find pid of process
  // traverse back from last column to the second column that has pid
  return cy
    .getByTestSubj('processesOutput-processListTable', { timeout: 120000 })
    .findByTestSubj('processesOutput-command')
    .contains(command)
    .parents('tr')
    .findByTestSubj('processesOutput-pid')
    .find('.euiTableCellContent')
    .then((cellContent) => {
      // get pid
      return Number(cellContent.text());
    });
};

export const tryAddingDisabledResponseAction = (itemNumber = 0) => {
  cy.getByTestSubj('response-actions-wrapper').within(() => {
    cy.getByTestSubj('Elastic Defend-response-action-type-selection-option').should('be.disabled');
  });
  // Try adding new action, should not add list item.
  cy.getByTestSubj('Elastic Defend-response-action-type-selection-option').click({
    force: true,
  });
  cy.getByTestSubj(`response-actions-list-item-${itemNumber}`).should('not.exist');
};

/**
 * Continuously checks an Response Action until it completes (or timeout is reached)
 * @param actionId
 * @param timeout
 */
export const waitForActionToComplete = (
  actionId: string,
  timeout = 120000
): Cypress.Chainable<ActionDetails> => {
  let action: ActionDetails | undefined;

  return cy
    .waitUntil(
      () => {
        return request<ActionDetailsApiResponse>({
          method: 'GET',
          url: resolvePathVariables(ACTION_DETAILS_ROUTE, { action_id: actionId || 'undefined' }),
        }).then((response) => {
          if (response.body.data.isCompleted) {
            action = response.body.data;
            return true;
          }

          return false;
        });
      },
      { timeout, interval: 2000 }
    )
    .then(() => {
      if (!action) {
        throw new Error(`Failed to retrieve completed action`);
      }

      return action;
    });
};

export const waitForActionToSucceed = (
  actionId: string,
  timeout = 180000
): Cypress.Chainable<ActionDetails> => {
  let action: ActionDetails | undefined;

  return cy
    .waitUntil(
      () => {
        return request<ActionDetailsApiResponse>({
          method: 'GET',
          url: resolvePathVariables(ACTION_DETAILS_ROUTE, { action_id: actionId || 'undefined' }),
        }).then((response) => {
          if (response.body.data.isCompleted && response.body.data.status === 'successful') {
            action = response.body.data;
            return true;
          }

          return false;
        });
      },
      { timeout, interval: 2000 }
    )
    .then(() => {
      if (!action) {
        throw new Error('Failed to retrieve successful action');
      }

      return action;
    });
};

/**
 * Ensure user has the given `accessLevel` to the type of response action
 * @param accessLevel
 * @param responseAction
 * @param username
 * @param password
 */
export const ensureResponseActionAuthzAccess = (
  accessLevel: Exclude<UserAuthzAccessLevel, 'read'>,
  responseAction: ResponseActionsApiCommandNames,
  username: string,
  password: string
): Cypress.Chainable => {
  let url: string = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apiPayload: any = {
    endpoint_ids: ['some-id'],
  };

  switch (responseAction) {
    case 'isolate':
      url = ISOLATE_HOST_ROUTE_V2;
      break;

    case 'unisolate':
      url = UNISOLATE_HOST_ROUTE_V2;
      break;

    case 'get-file':
      url = GET_FILE_ROUTE;
      Object.assign(apiPayload, { parameters: { path: 'one/two' } });
      break;

    case 'execute':
      url = EXECUTE_ROUTE;
      Object.assign(apiPayload, { parameters: { command: 'foo' } });
      break;
    case 'running-processes':
      url = GET_PROCESSES_ROUTE;
      break;

    case 'kill-process':
      url = KILL_PROCESS_ROUTE;
      Object.assign(apiPayload, { parameters: { pid: 123 } });
      break;

    case 'suspend-process':
      url = SUSPEND_PROCESS_ROUTE;
      Object.assign(apiPayload, { parameters: { pid: 123 } });
      break;

    case 'upload':
      url = UPLOAD_ROUTE;
      {
        const file = new File(['foo'], 'foo.txt');
        const formData = new FormData();
        formData.append('file', file, file.name);

        for (const [key, value] of Object.entries(apiPayload as object)) {
          formData.append(key, typeof value !== 'string' ? JSON.stringify(value) : value);
        }

        apiPayload = formData;
      }
      break;

    case 'scan':
      url = SCAN_ROUTE;
      Object.assign(apiPayload, { parameters: { path: 'scan/two' } });
      break;

    default:
      throw new Error(`Response action [${responseAction}] has no API payload defined`);
  }

  const requestOptions: Partial<Cypress.RequestOptions> = {
    url,
    method: 'post',
    auth: {
      user: username,
      pass: password,
    },
    headers: {
      'Content-Type': undefined,
    },
    failOnStatusCode: false,
    body: apiPayload as Cypress.RequestBody,
    // Increased timeout due to `upload` action. It seems to take much longer to complete due to file upload
    timeout: 120000,
  };

  if (accessLevel === 'none') {
    return request(requestOptions).its('status').should('equal', 403);
  }

  return request(requestOptions).its('status').should('not.equal', 403);
};
