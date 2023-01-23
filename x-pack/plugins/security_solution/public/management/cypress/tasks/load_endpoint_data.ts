/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { BASE_ENDPOINT_ROUTE } from '../../../../common/endpoint/constants';
import { runEndpointLoaderScript } from './run_endpoint_loader';

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
