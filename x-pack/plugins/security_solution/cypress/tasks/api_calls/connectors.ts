/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindActionResult } from '@kbn/actions-plugin/server';
import type { AsApiContract } from '@kbn/alerting-plugin/server/routes/lib';

export const createConnector = (connector: Record<string, unknown>) =>
  cy.request({
    method: 'POST',
    url: '/api/actions/action',
    body: connector,
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });

const slackConnectorAPIPayload = {
  actionTypeId: '.slack',
  secrets: {
    webhookUrl: 'http://localhost:123',
  },
  name: 'Slack cypress test e2e connector',
};

export const createSlackConnector = () => createConnector(slackConnectorAPIPayload);

export function deleteAllConnectors() {
  cy.log('Delete all alerts and rules');
  function fetchAndDelete() {
    // delete one at a time while there are any left i guess
    cy.log('Fetching list of connectors');
    cy.request({
      method: 'GET',
      url: '/api/actions/connectors',
      headers: { 'kbn-xsrf': 'cypress-creds' },
    }).then(function (response) {
      // cast this because thats where we are in life
      type Body = AsApiContract<FindActionResult[]>;
      const body: Body = response.body;
      cy.log(`Received list of connectors. There are ${body.length} left.`);
      if (body.length > 0) {
        const [{ id }]: Body = response.body;
        cy.log(`Deleting connector with id == ${id}`);
        cy.request({
          method: 'DELETE',
          url: `/api/actions/connector/${id}`,
          headers: { 'kbn-xsrf': 'cypress-creds' },
        }).then(fetchAndDelete);
      }
    });
  }
  fetchAndDelete();
}
