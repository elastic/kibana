/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createSpace = (id: string) => {
  cy.request({
    method: 'POST',
    url: 'api/spaces/space',
    body: {
      id,
      name: id,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  }).then((response) => {
    expect(response.status).equal(200);
  });
};

export const removeSpace = (id: string) => {
  cy.request({
    method: 'delete',
    url: `/api/spaces/space/${id}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
  }).then((response) => {
    expect(response.status).equal(204);
  });
};
