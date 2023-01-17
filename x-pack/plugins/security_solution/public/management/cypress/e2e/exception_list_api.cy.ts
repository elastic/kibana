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
import { loadEndpointIfNoneExist } from '../tasks/common/load_endpoint_data';
import { getPackagePolicyId } from '../tasks/package_policy';
import { platinum, gold } from '../fixtures/licenses';
import { testExceptionListItems } from '../fixtures/exception_list_entries';
import { createArtifactLists, removeAllArtifacts } from '../tasks/artifacts';

const verifyFindExceptionListItemsStatus = (
  listId: typeof ENDPOINT_ARTIFACT_LIST_IDS[number],
  response: {
    body: {
      data: unknown[];
    };
    status: number;
  }
) => {
  // HIE is not available on gold license
  // unless an HIE entry exists
  if (listId === ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id) {
    if (response.body.data?.length) {
      expect(response.status).to.eq(200);
    } else {
      expect(response.status).to.eq(403);
    }
  } else {
    // for all other artifacts
    expect(response.status).to.eq(200);
  }
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
      setupLicense(platinum);
    });

    for (const artifact of testExceptionListItems) {
      describe(`${artifact.name}`, () => {
        it(`should allow creating artifact with policy assigned`, () => {
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          cy.request({
            method: 'GET',
            url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
            failOnStatusCode: false,
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
              expect(createResponse.body.entries).to.deep.equal(artifact.testEntry.entries);
              expect(createResponse.body.list_id).to.eql(artifact.listId);
              expect(createResponse.body).to.have.property('created_at');
            });
          });
        });

        it(`should allow editing artifact with policy assigned`, () => {
          const updatedDescription = 'updated description';
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          cy.request({
            method: 'GET',
            url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
            failOnStatusCode: false,
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
                description: updatedDescription,
              },
              failOnStatusCode: false,
            }).then((createResponse) => {
              expect(createResponse.status).to.eq(200);
              expect(createResponse.body.entries).to.deep.equal(artifact.testEntry.entries);
              expect(createResponse.body.list_id).to.eql(artifact.listId);
              expect(createResponse.body.description).to.eql(updatedDescription);
            });
          });
        });

        it(`should allow detaching artifact from an assigned policy`, () => {
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          cy.request({
            method: 'GET',
            url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
            failOnStatusCode: false,
          }).then((response) => {
            expect(response.status).to.eq(200);
            cy.request({
              method: 'POST',
              url: EXCEPTION_LIST_ITEM_URL,
              headers: { 'kbn-xsrf': 'kibana' },
              body: {
                ...artifact.testEntry,
                list_id: artifact.listId,
                tags: [],
              },
              failOnStatusCode: false,
            }).then((createResponse) => {
              expect(createResponse.status).to.eq(200);
              expect(createResponse.body.entries).to.deep.equal(artifact.testEntry.entries);
              expect(createResponse.body.list_id).to.eql(artifact.listId);
              expect(createResponse.body.tags[0]).to.eql(undefined);
            });
          });
        });
      });
    }
  });

  describe('Gold license', () => {
    beforeEach(() => {
      setupLicense(gold);
    });

    for (const artifact of testExceptionListItems) {
      describe(`${artifact.name}`, () => {
        it(`should not allow creating artifact with policy assigned`, () => {
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          cy.request({
            method: 'GET',
            url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
            failOnStatusCode: false,
          }).then((response) => {
            verifyFindExceptionListItemsStatus(artifact.listId, response);
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
              const errorMessage =
                artifact.listId === ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id
                  ? 'Endpoint authorization failure'
                  : 'Your license level does not allow create/update of by policy artifacts';
              expect(createResponse.body.message).to.eql(`EndpointArtifactError: ${errorMessage}`);
            });
          });
        });

        it(`should not allow artifact to edit with policy assigned`, () => {
          const updatedDescription = 'updated description';
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          cy.request({
            method: 'GET',
            url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
            failOnStatusCode: false,
          }).then((response) => {
            verifyFindExceptionListItemsStatus(artifact.listId, response);
            cy.request({
              method: 'POST',
              url: EXCEPTION_LIST_ITEM_URL,
              headers: { 'kbn-xsrf': 'kibana' },
              body: {
                ...artifact.testEntry,
                list_id: artifact.listId,
                tags: [`policy:${policyId}`],
                description: updatedDescription,
              },
              failOnStatusCode: false,
            }).then((createResponse) => {
              expect(createResponse.status).to.eq(403);
              const errorMessage =
                artifact.listId === ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id
                  ? 'Endpoint authorization failure'
                  : 'Your license level does not allow create/update of by policy artifacts';
              expect(createResponse.body.message).to.eql(`EndpointArtifactError: ${errorMessage}`);
            });
          });
        });

        it(`should not allow artifact detaching an assigned policy`, () => {
          loginWithWriteAccess(`/app/security/administration/${artifact.pageId}`);
          cy.request({
            method: 'GET',
            url: `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${artifact.listId}&namespace_type=agnostic`,
            failOnStatusCode: false,
          }).then((response) => {
            verifyFindExceptionListItemsStatus(artifact.listId, response);
            cy.request({
              method: 'POST',
              url: EXCEPTION_LIST_ITEM_URL,
              headers: { 'kbn-xsrf': 'kibana' },
              body: {
                ...artifact.testEntry,
                list_id: artifact.listId,
                tags: [],
              },
              failOnStatusCode: false,
            }).then((createResponse) => {
              expect(createResponse.status).to.eq(403);
              const errorMessage =
                artifact.listId === ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id
                  ? 'Endpoint authorization failure'
                  : 'Your license level does not allow create/update of by policy artifacts';
              expect(createResponse.body.message).to.eql(`EndpointArtifactError: ${errorMessage}`);
            });
          });
        });
      });
    }
  });
});
