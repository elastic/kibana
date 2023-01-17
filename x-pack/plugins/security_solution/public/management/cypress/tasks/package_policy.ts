/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getPackagePolicyId = () => {
  const auth = {
    user: Cypress.env('ELASTICSEARCH_USERNAME'),
    pass: Cypress.env('ELASTICSEARCH_PASSWORD'),
  };
  return cy
    .request({
      auth,
      method: 'GET',
      url: '/api/fleet/package_policies',
    })
    .as('packagePoliciesResponse')
    .then(function () {
      expect(this.packagePoliciesResponse.status).to.eq(200);
      const endpointPackage = this.packagePoliciesResponse.body.items.find(
        (policy: {
          package: {
            name: string;
          };
        }) => policy.package.name === 'endpoint'
      );
      return endpointPackage.id;
    });
};
