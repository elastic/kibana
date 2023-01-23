/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
} from '@kbn/securitysolution-list-constants';
import { login, loginWithRole, ROLE } from '../tasks/login';
import { setupLicense } from '../tasks/license';
import { loadEndpointIfNoneExist } from '../tasks/load_endpoint_data';
import { getPackagePolicyId } from '../tasks/package_policy';
import { getPlatinumLicense, getGoldLicense } from '../fixtures/licenses';
import { getTestExceptionListItems } from '../fixtures/exception_list_entries';
import { createArtifactLists, removeAllArtifacts } from '../tasks/artifacts';

const verifyErrorMessage = (
  listId: typeof ENDPOINT_ARTIFACT_LIST_IDS[number],
  response: { status: number; body: { message: string } }
) => {
  const errorMessage =
    listId === ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id
      ? 'Endpoint authorization failure'
      : 'Your license level does not allow create/update of policy artifacts';
  expect(response.body.message).to.eql(`EndpointArtifactError: ${errorMessage}`);
};

const createTestArtifact = (
  listId: typeof ENDPOINT_ARTIFACT_LIST_IDS[number],
  policyId: string,
  testEntry: ReturnType<typeof getTestExceptionListItems>[number]['testEntry']
): Cypress.Chainable<Cypress.Response<string>> => {
  return cy
    .request({
      method: 'GET',
      url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${listId}&namespace_type=agnostic`,
    })
    .then((response) => {
      expect(response.status).to.eq(200);

      cy.request({
        method: 'POST',
        url: EXCEPTION_LIST_ITEM_URL,
        headers: { 'kbn-xsrf': 'kibana' },
        body: {
          ...testEntry,
          list_id: listId,
          tags: [`policy:${policyId}`],
        },
        failOnStatusCode: false,
      }).then((createResponse) => {
        expect(createResponse.status).to.eq(200);
        return createResponse.body.id;
      });
    });
};

const loginWithWriteAccess = (url: string) => {
  loginWithRole(ROLE.analyst_hunter);
  cy.visit(url);
};

describe('Exception lists', () => {
  let policyId = '';
  before(() => {
    login();
    loadEndpointIfNoneExist();
    removeAllArtifacts();
    createArtifactLists();
    getPackagePolicyId().then((id) => (policyId = id));
  });

  after(() => {
    removeAllArtifacts();
  });

  describe('Platinum license', () => {
    beforeEach(() => {
      setupLicense(getPlatinumLicense());
    });

    for (const artifact of getTestExceptionListItems()) {
      describe(`${artifact.name}`, () => {
        it('should allow creating artifact with policy assigned', () => {
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          cy.request({
            method: 'GET',
            url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
          }).then((response) => {
            expect(response.status).to.eq(200);
            cy.request({
              method: 'POST',
              url: EXCEPTION_LIST_ITEM_URL,
              headers: { 'kbn-xsrf': 'kibana' },
              body: {
                ...artifact.testEntry,
                list_id: artifact.listId,
                tags: [`policy:${policyId}`],
              },
              failOnStatusCode: false,
            }).then((createResponse) => {
              expect(createResponse.status).to.eq(200);
            });
          });
        });

        it('should allow editing artifact with policy assigned', () => {
          const updatedDescription = 'updated description';
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);

          createTestArtifact(artifact.listId, policyId, artifact.testEntry).then((artifactId) => {
            cy.request({
              method: 'GET',
              url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
            }).then((response) => {
              expect(response.status).to.eq(200);
              cy.request({
                method: 'PUT',
                url: EXCEPTION_LIST_ITEM_URL,
                headers: { 'kbn-xsrf': 'kibana' },
                body: {
                  ...artifact.testEntry,
                  id: artifactId,
                  tags: [`policy:${policyId}`],
                  description: updatedDescription,
                },
                failOnStatusCode: false,
              }).then((createResponse) => {
                expect(createResponse.status).to.eq(200);
              });
            });
          });
        });

        it('should allow detaching artifact from an assigned policy', () => {
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);

          createTestArtifact(artifact.listId, policyId, artifact.testEntry).then((artifactId) => {
            cy.request({
              method: 'GET',
              url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
              failOnStatusCode: false,
            }).then((response) => {
              expect(response.status).to.eq(200);
              cy.request({
                method: 'PUT',
                url: EXCEPTION_LIST_ITEM_URL,
                headers: { 'kbn-xsrf': 'kibana' },
                body: {
                  ...artifact.testEntry,
                  id: artifactId,
                },
                failOnStatusCode: false,
              }).then((createResponse) => {
                expect(createResponse.status).to.eq(200);
              });
            });
          });
        });
      });
    }
  });

  describe('Gold license', () => {
    beforeEach(() => {
      setupLicense(getGoldLicense());
    });

    for (const artifact of getTestExceptionListItems().filter(
      (item) => item.pageId !== 'host_isolation_exceptions'
    )) {
      describe(`${artifact.name}`, () => {
        it('should not allow creating artifact with policy assigned', () => {
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          cy.request({
            method: 'GET',
            url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
          }).then((response) => {
            expect(response.status).to.eq(200);
            cy.request({
              method: 'POST',
              url: EXCEPTION_LIST_ITEM_URL,
              headers: { 'kbn-xsrf': 'kibana' },
              body: {
                ...artifact.testEntry,
                list_id: artifact.listId,
                tags: [`policy:${policyId}`],
              },
              failOnStatusCode: false,
            }).then((createResponse) => {
              expect(createResponse.status).to.eq(403);
              verifyErrorMessage(artifact.listId, createResponse);
            });
          });
        });

        it('should allow creating artifact with global policy', () => {
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          cy.request({
            method: 'GET',
            url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
          }).then((response) => {
            expect(response.status).to.eq(200);
            cy.request({
              method: 'POST',
              url: EXCEPTION_LIST_ITEM_URL,
              headers: { 'kbn-xsrf': 'kibana' },
              body: {
                ...artifact.testEntry,
                list_id: artifact.listId,
                tags: ['policy:all'],
              },
              failOnStatusCode: false,
            }).then((createResponse) => {
              expect(createResponse.status).to.eq(200);
            });
          });
        });

        it('should not allow artifact to assign a specific policy', () => {
          const updatedDescription = 'updated description';
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);

          createTestArtifact(artifact.listId, 'all', artifact.testEntry).then((artifactId) => {
            cy.request({
              method: 'GET',
              url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
            }).then((response) => {
              expect(response.status).to.eq(200);
              cy.request({
                method: 'PUT',
                url: EXCEPTION_LIST_ITEM_URL,
                headers: { 'kbn-xsrf': 'kibana' },
                body: {
                  ...artifact.testEntry,
                  id: artifactId,
                  tags: [`policy:${policyId}`],
                  description: updatedDescription,
                },
                failOnStatusCode: false,
              }).then((editResponse) => {
                expect(editResponse.status).to.eq(403);
                verifyErrorMessage(artifact.listId, editResponse);
              });
            });
          });
        });

        // TODO: fix this test
        // not sure why this returns a 200 here
        // when clearly testing it with local es/kibana instance it returns a 403
        it.skip('should not allow artifact detaching from global policy', () => {
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          createTestArtifact(artifact.listId, 'all', artifact.testEntry).then((artifactId) => {
            cy.request({
              method: 'GET',
              url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
            }).then((response) => {
              expect(response.status).to.eq(200);
              cy.request({
                method: 'PUT',
                url: EXCEPTION_LIST_ITEM_URL,
                headers: { 'kbn-xsrf': 'kibana' },
                body: {
                  ...artifact.testEntry,
                  id: artifactId,
                },
                failOnStatusCode: false,
              }).then((editResponse) => {
                expect(editResponse.status).to.eq(403);
                verifyErrorMessage(artifact.listId, editResponse);
              });
            });
          });
        });
      });
    }
  });
});
