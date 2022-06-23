/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const installPackageWithPolicy = (name: string, version: string) => {
  cy.request({
    method: 'POST',
    url: `api/fleet/epm/packages/${name}/${version}`,
    body: {
      force: true,
      ignore_constraints: true,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

  cy.request({
    method: 'POST',
    url: 'api/fleet/agent_policies',
    body: {
      name: 'test policy',
      namespace: 'default',
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  }).then((response) => {
    cy.request({
      method: 'POST',
      url: 'api/fleet/package_policies',
      body: {
        force: true,
        name: 'test-1',
        description: '',
        namespace: 'default',
        policy_id: response.body.item.id,
        enabled: true,
        output_id: '',
        inputs: [],
        package: {
          name,
          version,
        },
      },
      headers: { 'kbn-xsrf': 'cypress-creds' },
      failOnStatusCode: false,
    });
  });
};
