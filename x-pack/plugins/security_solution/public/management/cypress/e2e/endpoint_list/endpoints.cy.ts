/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';
import { AGENT_HOSTNAME_CELL, TABLE_ROW_ACTIONS, TABLE_ROW_ACTIONS_MENU } from '../../screens';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { HOST_METADATA_LIST_ROUTE } from '../../../../../common/endpoint/constants';
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
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import { createEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';

describe('Endpoints page', { tags: ['@ess', '@serverless'] }, () => {
  let indexedPolicy: IndexedFleetEndpointPolicyResponse;
  let policy: PolicyData;
  let createdHost: CreateAndEnrollEndpointHostResponse;

  before(() => {
    getEndpointIntegrationVersion().then((version) => {
      createAgentPolicyTask(version).then((data) => {
        indexedPolicy = data;
        policy = indexedPolicy.integrationPolicies[0];

        return enableAllPolicyProtections(policy.id).then(() => {
          // Create and enroll a new Endpoint host
          return createEndpointHost(policy.policy_id).then((host) => {
            createdHost = host as CreateAndEnrollEndpointHostResponse;
          });
        });
      });
    });
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    if (createdHost) {
      cy.task('destroyEndpointHost', createdHost);
    }

    if (indexedPolicy) {
      cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
    }

    if (createdHost) {
      deleteAllLoadedEndpointData({ endpointAgentIds: [createdHost.agentId] });
    }
  });

  it('Shows endpoint on the list', () => {
    loadPage(APP_ENDPOINTS_PATH);
    cy.contains('Hosts running Elastic Defend').should('exist');
    cy.getByTestSubj(AGENT_HOSTNAME_CELL)
      .contains(createdHost.hostname)
      .should('have.text', createdHost.hostname);
  });

  it('should update endpoint policy on Endpoint', () => {
    cy.intercept({ pathname: HOST_METADATA_LIST_ROUTE }).as('metadataRequest');
    loadPage(APP_ENDPOINTS_PATH);

    const agentIdPath = 'response.body.data[0].metadata.agent.id';
    // ideally we should use applied policy instead: https://github.com/elastic/security-team/issues/8837
    const policyVersionPath = 'response.body.data[0].policy_info.endpoint.revision';
    cy.wait('@metadataRequest', { timeout: 30000 });
    cy.get('@metadataRequest').its(agentIdPath).should('be.a', 'string').as('endpointId');
    cy.get('@metadataRequest')
      .its(policyVersionPath)
      .should('be.a', 'number')
      .as('originalPolicyRevision');
    cy.get<string>('@endpointId')
      .then((endpointId: string) => cy.get(`[data-endpoint-id=${endpointId}]`))
      .as('endpointRow');

    // policyNameCellLink be.visible alone can potentially click too quickly
    // using TABLE_ROW_ACTIONS be.visible as a delay since it loads last on the row
    cy.get('@endpointRow').findByTestSubj(TABLE_ROW_ACTIONS).should('be.visible');
    cy.get('@endpointRow').findByTestSubj('policyNameCellLink').should('be.visible').click();
    cy.location('pathname', { timeout: 20000 }).should(
      'match',
      /^\/app\/security\/administration\/policy\/[a-f0-9-]+\/settings$/
    );

    // make a change to enable save
    cy.getByTestSubj('endpointPolicyForm-malware-blocklist-enableDisableSwitch')
      .should('be.visible')
      .as('blocklistSwitch');
    cy.get('@blocklistSwitch').click();
    cy.get('@blocklistSwitch').should('be.enabled');

    cy.getByTestSubj('policyDetailsSaveButton').should('be.visible').click();
    cy.getByTestSubj('policyDetailsConfirmModal').should('be.visible').click();
    cy.getByTestSubj('confirmModalConfirmButton').should('be.visible').click();
    cy.contains(/has been updated/);
    cy.getByTestSubj('policyDetailsBackLink').should('be.visible').click();
    cy.location('pathname', { timeout: 20000 }).should('equal', APP_ENDPOINTS_PATH);

    // Assert disappearing 'Out-of-date' indicator, Success Policy Status and increased revision number
    cy.get('@endpointRow')
      .findByTestSubj('rowPolicyOutOfDate', { timeout: 25000 })
      .should('not.exist'); // depends on the 10s auto-refresh

    cy.get('@endpointRow').findByTestSubj('policyStatusCellLink').should('contain', 'Success');

    cy.get<number>('@originalPolicyRevision').then((originalRevision: number) => {
      const revisionRegex = new RegExp(`^rev\\. ${originalRevision + 1}$`);
      cy.get('@endpointRow').findByTestSubj('policyListRevNo').contains(revisionRegex);
    });
  });

  describe('Endpoint reassignment', () => {
    let response: IndexedFleetEndpointPolicyResponse;
    let initialAgentData: Agent;

    before(() => {
      getAgentByHostName(createdHost.hostname).then((agentData) => {
        initialAgentData = agentData;
        return initialAgentData;
      });
      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version).then((data) => {
          response = data;
        });
      });
    });

    afterEach(() => {
      if (initialAgentData?.policy_id) {
        reassignAgentPolicy(initialAgentData.id, initialAgentData.policy_id);
      }
    });

    after(() => {
      if (response) {
        cy.task('deleteIndexedFleetEndpointPolicies', response);
      }
    });

    it('User can reassign a single endpoint to a different Agent Configuration', () => {
      cy.intercept({ pathname: HOST_METADATA_LIST_ROUTE }).as('metadataRequest');
      loadPage(APP_ENDPOINTS_PATH);

      const agentIdPath = 'response.body.data[0].metadata.agent.id';
      cy.wait('@metadataRequest', { timeout: 30000 })
        .its(agentIdPath)
        .should('be.a', 'string')
        .as('endpointId');
      cy.get<string>('@endpointId')
        .then((endpointId: string) => cy.get(`[data-endpoint-id=${endpointId}]`))
        .should('be.visible')
        .as('endpointRow');

      cy.get('@endpointRow')
        .findByTestSubj(TABLE_ROW_ACTIONS)
        .should('be.visible')
        .trigger('click');
      cy.getByTestSubj(TABLE_ROW_ACTIONS_MENU)
        .should('be.visible')
        .contains('Reassign agent policy')
        .click();
      cy.location('pathname', { timeout: 20000 }).should(
        'match',
        /^\/app\/fleet\/agents\/[a-f0-9-]+$/
      );

      cy.getByTestSubj(FLEET_REASSIGN_POLICY_MODAL)
        .find('select')
        .should('be.visible')
        .as('reassignPolicySelect');
      cy.get('@reassignPolicySelect').select(response.agentPolicies[0].name);
      cy.get('@reassignPolicySelect').should('have.value', response.agentPolicies[0].id);

      cy.getByTestSubj(FLEET_REASSIGN_POLICY_MODAL_CONFIRM_BUTTON)
        .should('be.visible')
        .and('be.enabled');
      cy.getByTestSubj(FLEET_REASSIGN_POLICY_MODAL_CONFIRM_BUTTON).click();

      // ideally we should use applied policy instead: https://github.com/elastic/security-team/issues/8837
      const policyIdPath = 'response.body.data[0].policy_info.agent.configured.id';
      // relies on multiple transforms so might take some extra time
      cy.get('@metadataRequest', { timeout: 120000 })
        .its(policyIdPath)
        .should('equal', response.agentPolicies[0].id);
    });
  });
});
