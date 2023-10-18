/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { performUserActions } from '../../tasks/perform_user_actions';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { HOST_METADATA_LIST_ROUTE } from '../../../../../common/endpoint/constants';
import type { MetadataListResponse, PolicyData } from '../../../../../common/endpoint/types';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { getArtifactsListTestsData } from '../../fixtures/artifacts_page';
import { removeAllArtifacts, removeAllArtifactsPromise } from '../../tasks/artifacts';
import { login } from '../../tasks/login';
import { request, loadPage } from '../../tasks/common';
import {
  createAgentPolicyTask,
  getEndpointIntegrationVersion,
  yieldEndpointPolicyRevision,
} from '../../tasks/fleet';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import { createEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';

const yieldAppliedEndpointRevision = (): Cypress.Chainable<number> =>
  request<MetadataListResponse>({
    method: 'GET',
    url: HOST_METADATA_LIST_ROUTE,
  }).then(({ body }) => {
    expect(body.data.length).is.lte(2); // during update it can be temporary zero
    return Number(body.data?.[0]?.metadata.Endpoint.policy.applied.endpoint_policy_version) ?? -1;
  });

const parseRevNumber = (revString: string) => Number(revString.match(/\d+/)?.[0]);

// FLAKY: https://github.com/elastic/kibana/issues/168342
describe.skip('Artifact pages', { tags: ['@ess', '@serverless'] }, () => {
  let indexedPolicy: IndexedFleetEndpointPolicyResponse;
  let policy: PolicyData;
  let createdHost: CreateAndEnrollEndpointHostResponse;

  before(() => {
    getEndpointIntegrationVersion().then((version) =>
      createAgentPolicyTask(version).then((data) => {
        indexedPolicy = data;
        policy = indexedPolicy.integrationPolicies[0];

        return enableAllPolicyProtections(policy.id).then(() => {
          // Create and enroll a new Endpoint host
          return createEndpointHost(policy.policy_id).then((host) => {
            createdHost = host as CreateAndEnrollEndpointHostResponse;
          });
        });
      })
    );
  });

  beforeEach(() => {
    // We need to wait until revision is bumped to ensure test success.
    // Fetch current revision, count how many artifacts are deleted, and wait until revision is bumped by that amount.
    yieldEndpointPolicyRevision().then((actualEndpointPolicyRevision) => {
      login();
      removeAllArtifactsPromise().then((removedArtifactCount) => {
        const hasReachedActualRevision = (revision: number) =>
          revision === actualEndpointPolicyRevision + removedArtifactCount;
        recurse(yieldAppliedEndpointRevision, hasReachedActualRevision, {
          delay: 2000,
          timeout: 90000,
        });
      });
    });
  });

  after(() => {
    removeAllArtifacts();
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

  for (const testData of getArtifactsListTestsData()) {
    describe(`${testData.title}`, () => {
      it(`should update Endpoint Policy on Endpoint when adding ${testData.artifactName}`, () => {
        loadPage(APP_ENDPOINTS_PATH);

        cy.get(`[data-endpoint-id="${createdHost.agentId}"]`).within(() => {
          cy.getByTestSubj('policyListRevNo')
            .invoke('text')
            .then((text) => {
              cy.wrap(parseRevNumber(text)).as('initialRevisionNumber');
            });
        });

        loadPage(`/app/security/administration/${testData.urlPath}`);

        cy.getByTestSubj(`${testData.pagePrefix}-emptyState-addButton`).click();
        performUserActions(testData.create.formActions);
        cy.getByTestSubj(`${testData.pagePrefix}-flyout-submitButton`).click();

        for (const checkResult of testData.create.checkResults) {
          cy.getByTestSubj(checkResult.selector).should('have.text', checkResult.value);
        }

        loadPage(APP_ENDPOINTS_PATH);
        (cy.get('@initialRevisionNumber') as unknown as Promise<number>).then(
          (initialRevisionNumber) => {
            cy.get(`[data-endpoint-id="${createdHost.agentId}"]`).within(() => {
              cy.getByTestSubj('policyListRevNo')
                .invoke('text')
                .should('include', initialRevisionNumber + 1);
            });
          }
        );
      });
    });
  }
});
