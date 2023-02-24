/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_ITEM_URL,
} from '@kbn/securitysolution-list-constants';
import { recurse } from 'cypress-recurse';
import { getArtifactsListTestsData } from '../../fixtures/artifacts_page';
import { API_HEADER, removeAllArtifacts } from '../../tasks/artifacts';
import { loadEndpointDataForEventFiltersIfNeeded } from '../../tasks/load_endpoint_data';
import { login } from '../../tasks/login';
import { performUserActions } from '../../tasks/perform_user_actions';

const yieldInstalledEndpointRevision = (): Cypress.Chainable<number> =>
  cy
    .request({ method: 'GET', url: '/api/endpoint/metadata', headers: API_HEADER })
    .then(({ body }) => {
      expect(body.data.length).is.lte(1); // during update it can be temporary zero
      return body.data?.[0]?.policy_info?.endpoint?.revision ?? -1;
    });

const yieldIsThereAnyArtifact = (listIds: readonly string[]): Cypress.Chainable<boolean> =>
  cy
    .request({
      method: 'GET',
      url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${listIds[0]}&namespace_type=agnostic`,
      failOnStatusCode: false,
    })
    .then(({ status, body }) => {
      if (status === 200 && body.total > 0) {
        return true;
      } else if (listIds.length > 1) {
        return yieldIsThereAnyArtifact(listIds.slice(1));
      } else {
        return false;
      }
    });

const parseRevNumber = (revString: string) => Number(revString.match(/\d+/)?.[0]);

describe('Artifact pages', () => {
  before(() => {
    login();
    loadEndpointDataForEventFiltersIfNeeded();

    let initialRevisionNumber: number;
    const hasRevisionBumpedOnEndpoint = (revision: number) =>
      revision === initialRevisionNumber + 1;

    yieldInstalledEndpointRevision()
      .then((revisionNumber) => {
        initialRevisionNumber = revisionNumber;

        return yieldIsThereAnyArtifact(ENDPOINT_ARTIFACT_LIST_IDS);
      })
      .then((isThereAnyArtifact) => {
        if (isThereAnyArtifact) {
          removeAllArtifacts();

          // need to wait until revision is bumped to ensure test success
          recurse(yieldInstalledEndpointRevision, hasRevisionBumpedOnEndpoint, { delay: 1500 });
        }
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
        cy.visit('/app/security/administration/endpoints');

        cy.getBySel('policyListRevNo')
          .eq(0)
          .invoke('text')
          .then(parseRevNumber)
          .then((initialRevisionNumber) => {
            cy.visit(`/app/security/administration/${testData.urlPath}`);

            cy.getBySel(`${testData.pagePrefix}-emptyState-addButton`).click();
            performUserActions(testData.create.formActions);
            cy.getBySel(`${testData.pagePrefix}-flyout-submitButton`).click();

            //   Check new artifact is in the list
            for (const checkResult of testData.create.checkResults) {
              cy.getBySel(checkResult.selector).should('have.text', checkResult.value);
            }

            cy.visit('/app/security/administration/endpoints');

            // depends on the 10s auto refresh
            cy.getBySel('policyListRevNo')
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
