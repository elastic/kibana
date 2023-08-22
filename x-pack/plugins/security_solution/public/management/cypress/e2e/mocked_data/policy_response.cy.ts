/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CyIndexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { navigateToEndpointPolicyResponse } from '../../screens/endpoints';
import type { HostMetadata } from '../../../../../common/endpoint/types';
import type { IndexedEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_endpoint_policy_response';
import { login } from '../../tasks/login';
import { navigateToFleetAgentDetails } from '../../screens/fleet';
import { EndpointPolicyResponseGenerator } from '../../../../../common/endpoint/data_generators/endpoint_policy_response_generator';
import { descriptions } from '../../../components/policy_response/policy_response_friendly_names';

describe('Endpoint Policy Response', () => {
  let loadedEndpoint: CyIndexEndpointHosts;
  let endpointMetadata: HostMetadata;
  let loadedPolicyResponse: IndexedEndpointPolicyResponse;

  before(() => {
    const policyResponseGenerator = new EndpointPolicyResponseGenerator();

    indexEndpointHosts({ count: 1, os: 'macOS' }).then((indexEndpoints) => {
      loadedEndpoint = indexEndpoints;
      endpointMetadata = loadedEndpoint.data.hosts[0];

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
    });
  });

  after(() => {
    if (loadedEndpoint) {
      loadedEndpoint.cleanup();
    }

    if (loadedPolicyResponse) {
      cy.task('deleteIndexedEndpointPolicyResponse', loadedPolicyResponse);
    }
  });

  beforeEach(() => {
    login();
  });

  // TODO failing test skipped https://github.com/elastic/kibana/issues/162428
  describe.skip('from Fleet Agent Details page', () => {
    it('should display policy response with errors', () => {
      navigateToFleetAgentDetails(endpointMetadata.agent.id);

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

  describe('from Endpoint List page', () => {
    it('should display policy response with errors', () => {
      navigateToEndpointPolicyResponse(endpointMetadata.agent.id);

      cy.getByTestSubj('endpointDetailsPolicyResponseFlyoutBody')
        .findByTestSubj('endpointPolicyResponseErrorCallOut')
        .should('be.visible')
        .findByTestSubj('endpointPolicyResponseMessage')
        .should('include.text', descriptions.get('macos_system_ext'));
    });
  });
});
