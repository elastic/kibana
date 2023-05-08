/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { closeAllToasts } from '../../tasks/close_all_toasts';
import { toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import { ENDPOINT_VM_NAME } from '../../tasks/common';
import { login } from '../../tasks/login';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  createAgentPolicyTask,
  getAgentByHostName,
  getEndpointIntegrationVersion,
  reassignAgentPolicy,
} from '../../tasks/fleet';
import { changeAlertsFilter } from '../../tasks/alerts';

describe('Automated Response Actions', () => {
  const endpointHostname = Cypress.env(ENDPOINT_VM_NAME);
  const unenrolledHost = 'Host unenrolled';
  beforeEach(() => {
    login();
  });

  describe('From alerts', () => {
    let response: IndexedFleetEndpointPolicyResponse;
    let initialAgentData: Agent;
    let ruleId: string;
    let ruleName: string;

    before(() => {
      getAgentByHostName(endpointHostname).then((agentData) => {
        initialAgentData = agentData;
      });

      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version).then((data) => {
          response = data;
        });
      });
      loadRule(true).then((data) => {
        ruleId = data.id;
        ruleName = data.name;
      });
    });

    after(() => {
      if (initialAgentData?.policy_id) {
        reassignAgentPolicy(initialAgentData.id, initialAgentData.policy_id);
      }
      if (response) {
        cy.task('deleteIndexedFleetEndpointPolicies', response);
      }
      if (ruleId) {
        cleanupRule(ruleId);
      }
    });

    it('should have generated endpoint and rule', () => {
      cy.visit(APP_ENDPOINTS_PATH);
      cy.contains(endpointHostname).should('exist');

      toggleRuleOffAndOn(ruleName);
    });

    it('should display endpoint automated response action in event details flyout ', () => {
      visitRuleAlerts(ruleName);
      closeAllToasts();

      changeAlertsFilter('event.category: "file"');
      cy.getByTestSubj('expand-event').first().click();
      cy.getByTestSubj('endpointViewTab').click();
      cy.getByTestSubj('endpoint-actions-notification').should('not.have.text', '0');
      cy.getByTestSubj('endpoint-actions-results-table').within(() => {
        cy.get('tbody tr').each(($tr, index) => {
          cy.wrap($tr).within(() => {
            cy.contains('Triggered by rule');
            if (index === 0) {
              cy.getByTestSubj('endpoint-actions-results-table-column-hostname').contains(
                endpointHostname
              );
              cy.getByTestSubj('endpoint-actions-results-table-column-status', {
                timeout: 60000,
              }).should(($status) => {
                expect($status).to.contain('Successful');
              });
              cy.getByTestSubj('endpoint-actions-results-table-expand-button').click();
              cy.wrap($tr).siblings().contains('isolate completed successfully');
            }
            if (index === 1) {
              cy.getByTestSubj('endpoint-actions-results-table-column-hostname').contains(
                unenrolledHost
              );
              cy.getByTestSubj('endpoint-actions-results-table-column-status').contains('Failed');
              cy.getByTestSubj('endpoint-actions-results-table-expand-button').click();
              cy.wrap($tr)
                .siblings()
                .contains('The host does not have Elastic Defend integration installed');
            }
          });
        });
      });
    });
  });
});
