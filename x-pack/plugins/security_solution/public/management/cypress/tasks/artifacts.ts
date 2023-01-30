/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PACKAGE_POLICY_API_ROOT } from '@kbn/fleet-plugin/common';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_ARTIFACT_LISTS,
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';

const API_HEADER = { 'kbn-xsrf': 'kibana' };

export const removeAllArtifacts = () => {
  for (const listId of ENDPOINT_ARTIFACT_LIST_IDS) {
    removeArtifactsFromLists(listId);
  }
};

export const removeArtifactsFromLists = (listId: string) => {
  cy.request({
    method: 'DELETE',
    url: `${EXCEPTION_LIST_URL}?list_id=${listId}&namespace_type=agnostic`,
    headers: API_HEADER,
    failOnStatusCode: false,
  });
};

const ENDPOINT_ARTIFACT_LIST_TYPES = {
  [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: ExceptionListTypeEnum.ENDPOINT,
  [ENDPOINT_ARTIFACT_LISTS.eventFilters.id]: ExceptionListTypeEnum.ENDPOINT_EVENTS,
  [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id]:
    ExceptionListTypeEnum.ENDPOINT_HOST_ISOLATION_EXCEPTIONS,
  [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
};

export const createArtifactList = (listId: string) => {
  cy.request({
    method: 'POST',
    url: EXCEPTION_LIST_URL,
    headers: API_HEADER,
    body: {
      name: listId,
      description: 'This is a test list',
      list_id: listId,
      type: ENDPOINT_ARTIFACT_LIST_TYPES[listId],
      namespace_type: 'agnostic',
    },
  }).then((response) => {
    expect(response.status).to.eql(200);
    expect(response.body.list_id).to.eql(listId);
    expect(response.body.type).to.eql(ENDPOINT_ARTIFACT_LIST_TYPES[listId]);
  });
};

export const createPerPolicyArtifact = (name: string, body: object, policyId?: 'all' | string) => {
  cy.request({
    method: 'POST',
    url: EXCEPTION_LIST_ITEM_URL,

    headers: API_HEADER,
    body: {
      name,
      description: '',
      type: 'simple',
      namespace_type: 'agnostic',
      ...body,
      ...(policyId ? { tags: [`policy:${policyId}`] } : {}),
    },
  });
};

export const yieldFirstPolicyID = () => {
  return cy
    .request({
      method: 'GET',
      url: `${PACKAGE_POLICY_API_ROOT}?page=1&perPage=1&kuery=ingest-package-policies.package.name: endpoint`,
    })
    .then(({ body }) => {
      expect(body.items.length).to.be.least(1);
      return body.items[0].id;
    });
};
