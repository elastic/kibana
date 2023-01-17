/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const setupLicense = (body: {
  license: Record<string, unknown | { type: 'gold' | 'platinum' | 'enterprise' }>;
}) => {
  const auth = {
    user: Cypress.env('ELASTICSEARCH_USERNAME'),
    pass: Cypress.env('ELASTICSEARCH_PASSWORD'),
  };
  cy.request({
    auth,
    body,
    headers: {
      'kbn-xsrf': 'cypress',
    },
    method: 'PUT',
    url: '/api/license?acknowledge=true',
    failOnStatusCode: false,
  })
    .then((response) => {
      expect(response.status).equal(200);
      expect(response.body.acknowledged).equal(true);
      expect(response.body.license_status).equal('valid');

      cy.request({
        auth,
        method: 'GET',
        url: 'api/licensing/info',
      });
    })
    .then((licenseInfo) => {
      expect(licenseInfo.status).to.eq(200);
      expect(licenseInfo.body.license.status).to.eq('active');
      expect(licenseInfo.body.license.type).to.eq(body.license.type);
      expect(licenseInfo.body.license.mode).to.eq(body.license.type);
    });
};
