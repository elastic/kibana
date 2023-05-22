/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from './common';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { ACTION_DETAILS_ROUTE } from '../../../../common/endpoint/constants';
import type { ActionDetails, ActionDetailsApiResponse } from '../../../../common/endpoint/types';
import { ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS } from '../../../../common/endpoint/service/response_actions/constants';

export const validateAvailableCommands = () => {
  cy.get('[data-test-subj^="command-type"]').should(
    'have.length',
    ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS.length
  );
  ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS.forEach((command) => {
    cy.getByTestSubj(`command-type-${command}`);
  });
};
export const addEndpointResponseAction = () => {
  cy.getByTestSubj('response-actions-wrapper').within(() => {
    cy.getByTestSubj('Endpoint Security-response-action-type-selection-option').click();
  });
};
export const focusAndOpenCommandDropdown = (number = 0) => {
  cy.getByTestSubj(`response-actions-list-item-${number}`).within(() => {
    cy.getByTestSubj('input').type(`example${number}`);
    cy.getByTestSubj('commandTypeField').click();
  });
};
export const fillUpNewRule = (name = 'Test', description = 'Test') => {
  cy.visit('app/security/rules/management');
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
export const visitRuleActions = (ruleId: string) => {
  cy.visit(`app/security/rules/id/${ruleId}/edit`);
  cy.getByTestSubj('edit-rule-actions-tab').should('exist');
  cy.getByTestSubj('globalLoadingIndicator').should('not.exist');
  cy.getByTestSubj('edit-rule-actions-tab').click();
};
export const tryAddingDisabledResponseAction = (itemNumber = 0) => {
  cy.getByTestSubj('response-actions-wrapper').within(() => {
    cy.getByTestSubj('Endpoint Security-response-action-type-selection-option').should(
      'be.disabled'
    );
  });
  // Try adding new action, should not add list item.
  cy.getByTestSubj('Endpoint Security-response-action-type-selection-option').click({
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
  timeout = 60000
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
      { timeout }
    )
    .then(() => {
      if (!action) {
        throw new Error(`Failed to retrieve completed action`);
      }

      return action;
    });
};
