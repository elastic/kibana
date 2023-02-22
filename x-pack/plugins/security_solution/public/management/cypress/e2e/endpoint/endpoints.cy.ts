/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';
import { ENDPOINT_VM_NAME } from '../../tasks/common';
import {
  getAgentByHostName,
  getEndpointIntegrationVersion,
  reassignAgentPolicy,
} from '../../tasks/fleet';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { login } from '../../tasks/login';
import {
  AGENT_HOSTNAME_CELL,
  TABLE_ROW_ACTIONS,
  TABLE_ROW_ACTIONS_MENU,
  AGENT_POLICY_CELL,
} from '../../screens/endpoints';
import {
  FLEET_REASSIGN_POLICY_MODAL,
  FLEET_REASSIGN_POLICY_MODAL_CONFIRM_BUTTON,
} from '../../screens/fleet';

describe('Endpoints page', () => {
  const endpointHostname = Cypress.env(ENDPOINT_VM_NAME);

  beforeEach(() => {
    login();
  });

  it('Loads the endpoints page', () => {
    cy.visit('/app/security/administration/endpoints');
    cy.contains('Hosts running Elastic Defend').should('exist');
    cy.getByTestId(AGENT_HOSTNAME_CELL).should('have.text', endpointHostname);
  });

  describe('Endpoint reassignment', () => {
    let response: IndexedFleetEndpointPolicyResponse;
    let initialAgentData: Agent;

    before(() => {
      getAgentByHostName(endpointHostname).then((agentData) => {
        initialAgentData = agentData;
      });
      getEndpointIntegrationVersion().then((version) => {
        cy.task<IndexedFleetEndpointPolicyResponse>('indexFleetEndpointPolicy', {
          policyName: `Reassign ${Math.random().toString(36).substr(2, 5)}`,
          endpointPackageVersion: version,
        }).then((data) => {
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
      cy.visit('/app/security/administration/endpoints');
      const hostname = cy
        .getByTestId(AGENT_HOSTNAME_CELL)
        .filter(`:contains("${endpointHostname}")`);
      const tableRow = hostname.parents('tr');
      tableRow.getByTestId(TABLE_ROW_ACTIONS).click();
      cy.getByTestId(TABLE_ROW_ACTIONS_MENU).contains('Reassign agent policy').click();
      cy.getByTestId(FLEET_REASSIGN_POLICY_MODAL)
        .find('select')
        .select(response.agentPolicies[0].name);
      cy.getByTestId(FLEET_REASSIGN_POLICY_MODAL_CONFIRM_BUTTON).click();
      cy.getByTestId(AGENT_HOSTNAME_CELL)
        .filter(`:contains("${endpointHostname}")`)
        .should('exist');
      cy.getByTestId(AGENT_HOSTNAME_CELL)
        .filter(`:contains("${endpointHostname}")`)
        .parents('tr')
        .getByTestId(AGENT_POLICY_CELL)
        .should('have.text', response.agentPolicies[0].name);
    });
  });
});
