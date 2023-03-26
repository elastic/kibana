/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndexedHostsAndAlertsResponse,
  DeleteIndexedHostsAndAlertsResponse,
} from '../../../../common/endpoint/index_data';

interface CyIndexEndpointHosts {
  data: IndexedHostsAndAlertsResponse;
  cleanup: () => Cypress.Chainable<DeleteIndexedHostsAndAlertsResponse>;
}

export const indexEndpointHosts = (
  options: {
    count?: number;
  } = {}
): Cypress.Chainable<CyIndexEndpointHosts> => {
  return cy.task('indexEndpointHosts', options).then((indexHosts) => {
    return {
      data: indexHosts,
      cleanup: () => {
        cy.log(
          'Deleting Endpoint Host data',
          indexHosts.hosts.map((host) => `${host.host.name} (${host.host.id})`)
        );

        return cy.task('deleteIndexedEndpointHosts', indexHosts);
      },
    };
  });
};
