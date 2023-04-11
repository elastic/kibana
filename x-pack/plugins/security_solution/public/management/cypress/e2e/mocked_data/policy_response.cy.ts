/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostMetadata } from '../../../../../common/endpoint/types';
import type { IndexedEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_endpoint_policy_response';
import type { IndexedHostsResponse } from '../../../../../common/endpoint/data_loaders/index_endpoint_hosts';
import { login } from '../../tasks/login';
import { navigateToFleetAgentDetails } from '../../screens/fleet';
import { EndpointPolicyResponseGenerator } from '../../../../../common/endpoint/data_generators/endpoint_policy_response_generator';
import { descriptions } from '../../../components/policy_response/policy_response_friendly_names';

describe('Endpoint Policy Response', () => {
  let loadedEndpoint: IndexedHostsResponse;
  let endpointMetadata: HostMetadata;
  let loadedPolicyResponse: IndexedEndpointPolicyResponse;

  before(() => {
    const policyResponseGenerator = new EndpointPolicyResponseGenerator();

    cy.task('indexEndpointHosts', { count: 1, os: 'macOS' }, { timeout: 120000 }).then(
      (indexEndpoints) => {
        loadedEndpoint = indexEndpoints;
        endpointMetadata = loadedEndpoint.hosts[0];

        const policyResponseDoc = policyResponseGenerator.generateConnectKernelFailure({
          agent: endpointMetadata.agent,
          elastic: endpointMetadata.elastic,
          Endpoint: {
            policy: {
              applied: {
                id: endpointMetadata.Endpoint.policy.applied.id,
                version: endpointMetadata.Endpoint.policy.applied.version,
                name: endpointMetadata.Endpoint.policy.applied.name,
              },
            },
          },
        });

        cy.task('indexEndpointPolicyResponse', policyResponseDoc).then((indexedPolicyResponse) => {
          loadedPolicyResponse = indexedPolicyResponse;
        });
      }
    );
  });

  after(() => {
    if (loadedEndpoint) {
      // FIXME:PT uncomment prior to merge
      // cy.task('deleteIndexedEndpointHosts', loadedEndpoint);
    }

    if (loadedPolicyResponse) {
      // FIXME:PT uncomment prior to merge
      // cy.task('deleteIndexedEndpointPolicyResponse', loadedPolicyResponse);
    }
  });

  beforeEach(() => {
    login();
  });

  describe('from Fleet Agent Details page', () => {
    it('should display policy response with errors', () => {
      navigateToFleetAgentDetails(loadedEndpoint.hosts[0].agent.id);

      cy.getByTestSubj('endpoint-0-accordion').then(($accordion) => {
        cy.wrap($accordion)
          .findByTestSubj('endpoint-0-accordion-needsAttention')
          .should('be.visible');

        cy.wrap($accordion).findByTestSubj('endpoint-0-accordion-openCloseToggle').click();
        cy.wrap($accordion)
          .findByTestSubj('endpointPolicyResponseErrorCallOut')
          .should('be.visible')
          .findByTestSubj('endpointPolicyResponseMessage')
          .should('include.text', descriptions.get('macos_system_ext'));
      });
    });
  });

  // describe('from Endpoint List page', () => {
  //   it('should display policy response with errors', () => {
  //     navigateToEndpointList();
  //   });
  // });
});
