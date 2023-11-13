/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addEndpointResponseAction,
  fillUpNewRule,
  focusAndOpenCommandDropdown,
  tryAddingDisabledResponseAction,
  validateAvailableCommands,
  visitRuleActions,
} from '../../tasks/response_actions';
import { cleanupRule, generateRandomStringName, loadRule } from '../../tasks/api_fixtures';
import { ResponseActionTypesEnum } from '../../../../../common/api/detection_engine';
import { login, ROLE } from '../../tasks/login';

describe(
  'Form',
  {
    tags: [
      '@ess',
      '@serverless',

      // Not supported in serverless! Test suite uses custom roles
      '@brokenInServerless',
    ],
  },
  () => {
    // FLAKY: https://github.com/elastic/kibana/issues/169334
    describe.skip('User with no access can not create an endpoint response action', () => {
      beforeEach(() => {
        login(ROLE.endpoint_response_actions_no_access);
      });

      it('no endpoint response action option during rule creation', () => {
        fillUpNewRule();
        tryAddingDisabledResponseAction();
      });
    });

    describe('User with access can create and save an endpoint response action', () => {
      const testedCommand = 'isolate';
      let ruleId: string;
      const [ruleName, ruleDescription] = generateRandomStringName(2);

      beforeEach(() => {
        login(ROLE.endpoint_response_actions_access);
      });
      afterEach(() => {
        if (ruleId) {
          cleanupRule(ruleId);
        }
      });

      it('create and save endpoint response action inside of a rule', () => {
        fillUpNewRule(ruleName, ruleDescription);
        addEndpointResponseAction();
        focusAndOpenCommandDropdown();
        validateAvailableCommands();
        cy.getByTestSubj(`command-type-${testedCommand}`).click();
        addEndpointResponseAction();
        focusAndOpenCommandDropdown(1);
        validateAvailableCommands();
        // tested command selected in previous action, should be disabled.
        cy.getByTestSubj(`command-type-${testedCommand}`).should('have.attr', 'disabled');
        // Remove first response action, this should unlock tested command as an option
        cy.getByTestSubj(`response-actions-list-item-0`).within(() => {
          cy.getByTestSubj('remove-response-action').click();
        });
        cy.getByTestSubj(`response-actions-list-item-0`).within(() => {
          cy.getByTestSubj('commandTypeField').click();
        });
        cy.getByTestSubj(`command-type-${testedCommand}`).should('not.have.attr', 'disabled');
        cy.getByTestSubj(`command-type-${testedCommand}`).click();
        cy.intercept('POST', '/api/detection_engine/rules', (request) => {
          const result = {
            action_type_id: ResponseActionTypesEnum['.endpoint'],
            params: {
              command: testedCommand,
              comment: 'example1',
            },
          };
          expect(request.body.response_actions[0]).to.deep.equal(result);
          request.continue((response) => {
            ruleId = response.body.id;
            response.send(response.body);
          });
        });
        cy.getByTestSubj('create-enabled-false').click();
        cy.contains(`${ruleName} was created`);
      });
    });

    describe('User with access can edit and delete an endpoint response action', () => {
      let ruleId: string;
      let ruleName: string;
      const testedCommand = 'isolate';
      const newDescription = 'Example isolate host description';

      beforeEach(() => {
        login(ROLE.endpoint_response_actions_access);
        loadRule().then((res) => {
          ruleId = res.id;
          ruleName = res.name;
        });
      });
      afterEach(() => {
        cleanupRule(ruleId);
      });

      it('edit response action inside of a rule', () => {
        visitRuleActions(ruleId);
        cy.getByTestSubj('edit-rule-actions-tab').click();

        cy.getByTestSubj(`response-actions-list-item-0`).within(() => {
          cy.getByTestSubj('input').should('have.value', 'Isolate host');
          cy.getByTestSubj('input').should('have.value', 'Isolate host');
          cy.getByTestSubj('input').type(`{selectall}{backspace}${newDescription}`);
          cy.getByTestSubj('commandTypeField').click();
        });
        validateAvailableCommands();
        cy.intercept('PUT', '/api/detection_engine/rules').as('updateResponseAction');
        cy.getByTestSubj('ruleEditSubmitButton').click();
        cy.wait('@updateResponseAction').should(({ request }) => {
          const query = {
            action_type_id: ResponseActionTypesEnum['.endpoint'],
            params: {
              command: testedCommand,
              comment: newDescription,
            },
          };
          expect(request.body.response_actions[0]).to.deep.equal(query);
        });
        cy.contains(`${ruleName} was saved`).should('exist');
      });

      it('delete response action inside of a rule', () => {
        visitRuleActions(ruleId);
        cy.getByTestSubj('edit-rule-actions-tab').click();

        cy.getByTestSubj(`response-actions-list-item-0`).within(() => {
          cy.getByTestSubj('remove-response-action').click();
        });
        cy.intercept('PUT', '/api/detection_engine/rules').as('deleteResponseAction');
        cy.getByTestSubj('ruleEditSubmitButton').click();
        cy.wait('@deleteResponseAction').should(({ request }) => {
          expect(request.body.response_actions).to.be.equal(undefined);
        });
        cy.contains(`${ruleName} was saved`).should('exist');
      });
    });

    describe('User should not see endpoint action when no rbac', () => {
      const [ruleName, ruleDescription] = generateRandomStringName(2);

      beforeEach(() => {
        login(ROLE.endpoint_response_actions_no_access);
      });

      it('response actions are disabled', () => {
        fillUpNewRule(ruleName, ruleDescription);
        cy.getByTestSubj('response-actions-wrapper').within(() => {
          cy.getByTestSubj('Endpoint Security-response-action-type-selection-option').should(
            'be.disabled'
          );
        });
      });
    });

    describe('User without access can not edit, add nor delete an endpoint response action', () => {
      let ruleId: string;

      beforeEach(() => {
        login(ROLE.endpoint_response_actions_no_access);
        loadRule().then((res) => {
          ruleId = res.id;
        });
      });

      afterEach(() => {
        cleanupRule(ruleId);
      });

      it('All response action controls are disabled', () => {
        visitRuleActions(ruleId);
        cy.getByTestSubj('edit-rule-actions-tab').click();

        cy.getByTestSubj('response-actions-wrapper').within(() => {
          cy.getByTestSubj('Endpoint Security-response-action-type-selection-option').should(
            'be.disabled'
          );
        });
        cy.getByTestSubj(`response-actions-list-item-0`).within(() => {
          cy.getByTestSubj('commandTypeField').should('have.text', 'isolate').and('be.disabled');
          cy.getByTestSubj('input').should('have.value', 'Isolate host').and('be.disabled');
          cy.getByTestSubj('remove-response-action').should('be.disabled');
          // Try removing action
          cy.getByTestSubj('remove-response-action').click({ force: true });
        });
        cy.getByTestSubj(`response-actions-list-item-0`).should('exist');
        tryAddingDisabledResponseAction(1);
      });
    });
  }
);
