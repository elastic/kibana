/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
