/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_ENDPOINT_ROUTE } from '../../../../../common/endpoint/constants';
import { runEndpointLoaderScript } from '../run_endpoint_loader';

export const loadEndpointIfNoneExist = () => {
  cy.request({
    method: 'GET',
    url: `${BASE_ENDPOINT_ROUTE}/metadata?page=0&pageSize=10&kuery=`,
    failOnStatusCode: false,
  }).then(({ body }) => {
    if (!body.data?.length) {
      runEndpointLoaderScript();
    }
  });
};
