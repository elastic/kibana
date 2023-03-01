/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedHostsAndAlertsResponse } from '../../../../common/endpoint/index_data';

export const indexEndpointHosts = async (
  options: {
    count?: number;
  } = {}
): Promise<{
  data: IndexedHostsAndAlertsResponse;
  cleanup: () => Promise<void>;
}> => {
  return new Promise((resolve) => {
    cy.task('indexEndpointHosts', options).then((indexHosts) => {
      resolve({
        data: indexHosts,
        cleanup: async (): Promise<void> => {
          cy.log(
            'Deleting Endpoint data',
            indexHosts.hosts.map((host) => `${host.host.name} (${host.host.id})`)
          );
          cy.task('deleteIndexedEndpointHosts', indexHosts);
        },
      });
    });
  });
};
