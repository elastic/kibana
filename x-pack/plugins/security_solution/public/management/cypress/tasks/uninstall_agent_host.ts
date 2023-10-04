/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// only used in "real" endpoint tests not in mocked ones
export const uninstallAgentFromHost = (
  hostname: string,
  uninstallToken?: string
): Cypress.Chainable<string> => {
  return cy.task('uninstallAgentFromHost', {
    hostname,
    uninstallToken,
  });
};

// only used in "real" endpoint tests not in mocked ones
export const ensureAgentAndEndpointHasBeenUninstalledFromHost = (
  hostname: string
): Cypress.Chainable<boolean> => {
  return cy.task('ensureAgentAndEndpointHasBeenUninstalledFromHost', {
    hostname,
  });
};
