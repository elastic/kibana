/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPackagePoliciesResponse } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_API_ROOT } from '@kbn/fleet-plugin/common';
import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_ARTIFACT_LISTS,
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { request } from './common';

export const removeAllArtifacts = () => {
  for (const listId of ENDPOINT_ARTIFACT_LIST_IDS) {
    removeExceptionsList(listId);
  }
};

export const removeAllArtifactsPromise = () =>
  Cypress.Promise.all(ENDPOINT_ARTIFACT_LIST_IDS.map(removeExceptionsListPromise)).then(
    (result) => result.filter(Boolean).length
  );

export const removeExceptionsList = (listId: string) => {
  request({
    method: 'DELETE',
    url: `${EXCEPTION_LIST_URL}?list_id=${listId}&namespace_type=agnostic`,
    failOnStatusCode: false,
  }).then(({ status }) => {
    expect(status).to.be.oneOf([200, 404]); // should either be success or not found
  });
};

const removeExceptionsListPromise = (listId: string) => {
  return new Cypress.Promise((resolve) => {
    request({
      method: 'DELETE',
      url: `${EXCEPTION_LIST_URL}?list_id=${listId}&namespace_type=agnostic`,
      failOnStatusCode: false,
    }).then(({ status }) => {
      expect(status).to.be.oneOf([200, 404]); // should either be success or not found
      resolve(status === 200);
    });
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
  request<ExceptionListSchema>({
    method: 'POST',
    url: EXCEPTION_LIST_URL,
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
  request<ExceptionListItemSchema>({
    method: 'POST',
    url: EXCEPTION_LIST_ITEM_URL,
    body: {
      name,
      description: '',
      type: 'simple',
      namespace_type: 'agnostic',
      ...body,
      ...(policyId ? { tags: [`policy:${policyId}`] } : {}),
    },
  }).then((response) => {
    expect(response.status).to.eql(200);
    expect(response.body.name).to.eql(name);
  });
};

export const yieldFirstPolicyID = (): Cypress.Chainable<string> =>
  request<GetPackagePoliciesResponse>({
    method: 'GET',
    url: `${PACKAGE_POLICY_API_ROOT}?page=1&perPage=1&kuery=ingest-package-policies.package.name: endpoint`,
  }).then(({ body }) => {
    expect(body.items.length).to.be.least(1);
    return body.items[0].id;
  });
