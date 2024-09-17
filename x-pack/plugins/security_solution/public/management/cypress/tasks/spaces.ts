/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Space } from '@kbn/spaces-plugin/common';
import { request } from './common';

export const createSpace = (spaceId: string): Cypress.Chainable<Cypress.Response<Space>> => {
  request({
    method: 'GET',
    url: '/api/spaces/space',
  }).then((response) => {
    // FIXME:PT remove - test code only
    // FIXME:PT remove - test code only
    console.log(`Current list of spaces:\n\n${JSON.stringify(response, null, '2')}`);
  });
  // FIXME:PT remove - test code only
  // FIXME:PT remove - test code only

  return request<Space>({
    method: 'POST',
    url: '/api/spaces/space',
    body: {
      name: spaceId,
      id: spaceId,
    },
  });
};

export const deleteSpace = (spaceId: string): Cypress.Chainable<Cypress.Response<void>> => {
  return request<void>({
    method: 'DELETE',
    url: `/api/spaces/space/${spaceId}`,
  });
};
