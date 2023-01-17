/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_ARTIFACT_LISTS,
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';

export const removeAllArtifacts = () => {
  for (const listId of ENDPOINT_ARTIFACT_LIST_IDS) {
    cy.request({
      method: 'DELETE',
      url: `${EXCEPTION_LIST_URL}?list_id=${listId}&namespace_type=agnostic`,
      headers: { 'kbn-xsrf': 'kibana' },
      failOnStatusCode: false,
    });
  }
};

const ENDPOINT_ARTIFACT_LIST_TYPES = {
  [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: ExceptionListTypeEnum.ENDPOINT,
  [ENDPOINT_ARTIFACT_LISTS.eventFilters.id]: ExceptionListTypeEnum.ENDPOINT_EVENTS,
  [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id]:
    ExceptionListTypeEnum.ENDPOINT_HOST_ISOLATION_EXCEPTIONS,
  [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
};

export const createArtifactLists = () => {
  for (const listId of ENDPOINT_ARTIFACT_LIST_IDS) {
    cy.request({
      method: 'POST',
      url: EXCEPTION_LIST_URL,
      headers: { 'kbn-xsrf': 'kibana' },
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
  }
};
