/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { getArtifactsListTestsData } from '../../fixtures/artifacts_page';
import { API_HEADER, removeAllArtifacts } from '../../tasks/artifacts';
import { loadEndpointDataForEventFiltersIfNeeded } from '../../tasks/load_endpoint_data';
import { login } from '../../tasks/login';
import { performUserActions } from '../../tasks/perform_user_actions';

const yieldEndpointPolicyRevision = (): Cypress.Chainable<number> =>
  cy
    .request({
      method: 'GET',
      url: '/api/fleet/package_policies?kuery=ingest-package-policies.package.name%3A%20endpoint',
      headers: API_HEADER,
    })
    .then(({ body }) => {
      return body.items?.[0]?.revision ?? -1;
    });

const yieldInstalledEndpointRevision = (): Cypress.Chainable<number> =>
  cy
    .request({ method: 'GET', url: '/api/endpoint/metadata', headers: API_HEADER })
    .then(({ body }) => {
      expect(body.data.length).is.lte(1); // during update it can be temporary zero
      return body.data?.[0]?.policy_info?.endpoint?.revision ?? -1;
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
      recurse(yieldInstalledEndpointRevision, hasReachedActualRevision, { delay: 1500 });
    });
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    removeAllArtifacts();
  });

  for (const testData of getArtifactsListTestsData()) {
    describe(`${testData.title}`, () => {
      it(`should update Endpoint Policy on Endpoint when adding ${testData.artifactName}`, () => {
        cy.visit(APP_ENDPOINTS_PATH);

        cy.getByTestSubj('policyListRevNo')
          .eq(0)
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
              .eq(0)
              .should(($div) => {
                const revisionNumber = parseRevNumber($div.text());
                expect(revisionNumber).to.eq(initialRevisionNumber + 1);
              });
          });
      });
    });
  }
});
