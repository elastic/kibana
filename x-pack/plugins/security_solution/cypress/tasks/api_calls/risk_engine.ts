/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const deleteConfiguration = () => {
  cy.request({
    method: 'GET',
    url: `/api/saved_objects/_find?type=risk-engine-configuration`,
    failOnStatusCode: false,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  }).then((res) => {
    const savedObjectId = res?.body?.saved_objects?.[0]?.id;
    if (savedObjectId) {
      return cy.request({
        method: 'DELETE',
        url: `/api/saved_objects/risk-engine-configuration/${savedObjectId}`,
        failOnStatusCode: false,
        headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      });
    }
  });
};
