/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedEndpointRuleAlerts } from '../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';

export const indexEndpointRuleAlerts = async (options: {
  endpointAgentId: string;
  count?: number;
}): Promise<IndexedEndpointRuleAlerts> => {
  return new Promise<IndexedEndpointRuleAlerts>((resolve) => {
    cy.task<IndexedEndpointRuleAlerts['alerts']>('indexEndpointRuleAlerts').then((alerts) => {
      resolve({
        alerts,
        cleanup: async (): Promise<void> => {
          cy.log(
            `Deleting Endpoint Rule Alerts data for endpoint id: ${options.endpointAgentId}`,
            alerts.map((alert) => alert._id)
          );
          cy.task('deleteIndexedEndpointRuleAlerts', alerts);
        },
      });
    });
  });
};
