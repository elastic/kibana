/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import {
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { BASE_ENDPOINT_ROUTE } from '../../../../common/endpoint/constants';
import { runEndpointLoaderScript } from './run_endpoint_loader';

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

// Checks for Endpoint data and creates it if needed
export const loadEndpointDataForEventFiltersIfNeeded = () => {
  cy.request({
    method: 'POST',
    url: `${BASE_ENDPOINT_ROUTE}/suggestions/eventFilters`,
    body: {
      field: 'agent.type',
      query: '',
    },
    headers: { 'kbn-xsrf': 'kibana' },
    failOnStatusCode: false,
  }).then(({ body }) => {
    if (isEmpty(body)) {
      runEndpointLoaderScript();
    }
  });
};
