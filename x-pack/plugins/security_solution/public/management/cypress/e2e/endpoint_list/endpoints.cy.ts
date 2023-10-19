/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';
import {
  AGENT_HOSTNAME_CELL,
  AGENT_POLICY_CELL,
  TABLE_ROW_ACTIONS,
  TABLE_ROW_ACTIONS_MENU,
} from '../../screens';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import {
  createAgentPolicyTask,
  getAgentByHostName,
  getEndpointIntegrationVersion,
  reassignAgentPolicy,
} from '../../tasks/fleet';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
import {
  FLEET_REASSIGN_POLICY_MODAL,
  FLEET_REASSIGN_POLICY_MODAL_CONFIRM_BUTTON,
} from '../../screens/fleet/agent_details';

// FLAKY: https://github.com/elastic/kibana/issues/168284
describe.skip('Endpoints page', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  before(() => {
    cy.createEndpointHost();
  });

  after(() => {
    cy.removeEndpointHost();
  });

  beforeEach(() => {
    login();
  });

  it('Shows endpoint on the list', () => {
    loadPage(APP_ENDPOINTS_PATH);
    cy.contains('Hosts running Elastic Defend').should('exist');
    cy.getCreatedHostData().then((hostData) =>
      cy
        .getByTestSubj(AGENT_HOSTNAME_CELL)
        .contains(hostData.createdHost.hostname)
        .should('have.text', hostData.createdHost.hostname)
    );
  });

  describe('Endpoint reassignment', () => {
    let response: IndexedFleetEndpointPolicyResponse;
    let initialAgentData: Agent;

    before(() => {
      cy.getCreatedHostData().then((hostData) =>
        getAgentByHostName(hostData.createdHost.hostname).then((agentData) => {
          initialAgentData = agentData;
        })
      );
      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version).then((data) => {
          response = data;
        });
      });
    });

    beforeEach(() => {
      login();
    });

    after(() => {
      if (initialAgentData?.policy_id) {
        reassignAgentPolicy(initialAgentData.id, initialAgentData.policy_id);
      }
      if (response) {
        cy.task('deleteIndexedFleetEndpointPolicies', response);
      }
    });

    it('User can reassign a single endpoint to a different Agent Configuration', () => {
      loadPage(APP_ENDPOINTS_PATH);
      cy.getCreatedHostData().then((hostData) =>
        cy
          .getByTestSubj(AGENT_HOSTNAME_CELL)
          .filter(`:contains("${hostData.createdHost.hostname}")`)
          .then((hostname) => {
            const tableRow = hostname.parents('tr');

            tableRow.find(`[data-test-subj=${TABLE_ROW_ACTIONS}`).trigger('click');
            cy.getByTestSubj(TABLE_ROW_ACTIONS_MENU).contains('Reassign agent policy').click();
            cy.getByTestSubj(FLEET_REASSIGN_POLICY_MODAL)
              .find('select')
              .select(response.agentPolicies[0].name);
            cy.getByTestSubj(FLEET_REASSIGN_POLICY_MODAL_CONFIRM_BUTTON).click();
            cy.getByTestSubj(AGENT_HOSTNAME_CELL)
              .filter(`:contains("${hostData.createdHost.hostname}")`)
              .should('exist');
            cy.getByTestSubj(AGENT_HOSTNAME_CELL)
              .filter(`:contains("${hostData.createdHost.hostname}")`)
              .parents('tr')
              .findByTestSubj(AGENT_POLICY_CELL)
              .should('have.text', response.agentPolicies[0].name);
          })
      );
    });
  });

  it('should update endpoint policy on Endpoint', () => {
    const parseRevNumber = (revString: string) => Number(revString.match(/\d+/)?.[0]);

    loadPage(APP_ENDPOINTS_PATH);

    cy.getByTestSubj('policyListRevNo')
      .first()
      .invoke('text')
      .then(parseRevNumber)
      .then((initialRevisionNumber) => {
        // Update policy
        cy.getByTestSubj('policyNameCellLink').first().click();

        cy.getByTestSubj('policyDetailsSaveButton').click();
        cy.getByTestSubj('policyDetailsConfirmModal').should('exist');
        cy.getByTestSubj('confirmModalConfirmButton').click();
        cy.contains(/has been updated/);

        cy.getByTestSubj('policyDetailsBackLink').click();

        // Assert disappearing 'Out-of-date' indicator, Success Policy Status and increased revision number
        cy.getByTestSubj('rowPolicyOutOfDate').should('exist');
        cy.getByTestSubj('rowPolicyOutOfDate').should('not.exist'); // depends on the 10s auto-refresh

        cy.getByTestSubj('policyStatusCellLink').first().should('contain', 'Success');

        cy.getByTestSubj('policyListRevNo')
          .first()
          .invoke('text')
          .then(parseRevNumber)
          .should('equal', initialRevisionNumber + 1);
      });
  });
});
