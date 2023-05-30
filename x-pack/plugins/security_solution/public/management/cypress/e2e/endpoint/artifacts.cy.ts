/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { HOST_METADATA_LIST_ROUTE } from '../../../../../common/endpoint/constants';
import type { MetadataListResponse } from '../../../../../common/endpoint/types';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { getArtifactsListTestsData } from '../../fixtures/artifacts_page';
import { removeAllArtifacts } from '../../tasks/artifacts';
import { loadEndpointDataForEventFiltersIfNeeded } from '../../tasks/load_endpoint_data';
import { login } from '../../tasks/login';
import { performUserActions } from '../../tasks/perform_user_actions';
import { request } from '../../tasks/common';
import { yieldEndpointPolicyRevision } from '../../tasks/fleet';

const yieldAppliedEndpointRevision = (): Cypress.Chainable<number> =>
  request<MetadataListResponse>({
    method: 'GET',
    url: HOST_METADATA_LIST_ROUTE,
  }).then(({ body }) => {
    expect(body.data.length).is.lte(1); // during update it can be temporary zero
    return Number(body.data?.[0]?.metadata.Endpoint.policy.applied.endpoint_policy_version) ?? -1;
  });

const parseRevNumber = (revString: string) => Number(revString.match(/\d+/)?.[0]);

describe('Artifact pages', () => {
  before(() => {
    login();
    loadEndpointDataForEventFiltersIfNeeded();
    removeAllArtifacts();

    // wait for ManifestManager to pick up artifact changes that happened either here
    // or in a previous test suite `after`
    cy.wait(6000); //  packagerTaskInterval + 1s

    yieldEndpointPolicyRevision().then((actualEndpointPolicyRevision) => {
      const hasReachedActualRevision = (revision: number) =>
        revision === actualEndpointPolicyRevision;

      // need to wait until revision is bumped to ensure test success
      recurse(yieldAppliedEndpointRevision, hasReachedActualRevision, { delay: 1500 });
    });
  });

  beforeEach(() => {
    login();
    cy.visit(APP_ENDPOINTS_PATH);
  });

  after(() => {
    removeAllArtifacts();
  });

  for (const testData of getArtifactsListTestsData()) {
    describe(`${testData.title}`, () => {
      it(`should update Endpoint Policy on Endpoint when adding ${testData.artifactName}`, () => {
        cy.getByTestSubj('policyListRevNo')
          .first()
          .invoke('text')
          .then(parseRevNumber)
          .then((initialRevisionNumber) => {
            cy.visit(`/app/security/administration/${testData.urlPath}`);

            cy.getByTestSubj(`${testData.pagePrefix}-emptyState-addButton`).click();
            performUserActions(testData.create.formActions);
            cy.getByTestSubj(`${testData.pagePrefix}-flyout-submitButton`).click();

            //   Check new artifact is in the list
            for (const checkResult of testData.create.checkResults) {
              cy.getByTestSubj(checkResult.selector).should('have.text', checkResult.value);
            }

            cy.visit(APP_ENDPOINTS_PATH);

            // depends on the 10s auto refresh
            cy.getByTestSubj('policyListRevNo')
              .first()
              .should(($div) => {
                const revisionNumber = parseRevNumber($div.text());
                expect(revisionNumber).to.eq(initialRevisionNumber + 1);
              });
          });
      });
    });
  }
});
