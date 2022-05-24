/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const waitForAlertsToBeIndexed = (alerts: number) => {
  cy.waitUntil(
    () =>
      cy
        .request({
          method: 'GET',
          url: `${Cypress.env('ELASTICSEARCH_URL')}/.alerts-security.alerts-default/_count`,
          failOnStatusCode: false,
        })
        .then((response) => response.body.count === alerts),
    {
      interval: 500,
      timeout: 12000,
    }
  );
};
