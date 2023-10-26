/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { performUserActions } from '../../tasks/perform_user_actions';
import { HOST_METADATA_LIST_ROUTE } from '../../../../../common/endpoint/constants';
import type { MetadataListResponse } from '../../../../../common/endpoint/types';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { getArtifactsListTestsData } from '../../fixtures/artifacts_page';
import { removeAllArtifacts, removeAllArtifactsPromise } from '../../tasks/artifacts';
import { login } from '../../tasks/login';
import { request, loadPage } from '../../tasks/common';
import { yieldEndpointPolicyRevision } from '../../tasks/fleet';

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
  before(() => {
    cy.createEndpointHost();
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
    cy.removeEndpointHost();
  });

  for (const testData of getArtifactsListTestsData()) {
    describe(`${testData.title}`, () => {
      it(`should update Endpoint Policy on Endpoint when adding ${testData.artifactName}`, () => {
        loadPage(APP_ENDPOINTS_PATH);

        cy.getCreatedHostData().then(({ createdHost }) => {
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
    });
  }
});
