/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageRecord } from '@kbn/security-solution-serverless/server/types';

export const startTransparentApiProxy = (options: { port?: number }): Cypress.Chainable<null> => {
  return cy.task('startTransparentApiProxy', options);
};

export const stopTransparentApiProxy = (): Cypress.Chainable<null> => {
  return cy.task('stopTransparentProxyApi');
};

export const getInterceptedRequestsFromTransparentApiProxy = (): Cypress.Chainable<
  UsageRecord[][]
> => {
  return cy.task('getInterceptedRequestsFromTransparentApiProxy');
};
