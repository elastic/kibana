/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAgentDoc } from './agents';

const FLEET_SERVER_POLICY_ID = 'fleet-server-policy';

// Create a Fleet server policy
export function setupFleetServer() {
  let policyId: string;
  let kibanaVersion: string;

  cy.request({
    method: 'POST',
    url: '/api/fleet/agent_policies',
    headers: { 'kbn-xsrf': 'xx' },
    body: {
      id: FLEET_SERVER_POLICY_ID,
      name: 'Fleet Server policy',
      namespace: 'default',
      has_fleet_server: true,
    },
  }).then((response: any) => {
    policyId = response.body.item.id;
  });

  cy.getKibanaVersion().then((version) => {
    kibanaVersion = version;
  });

  // setup Fleet server
  cy.wrap(null).then(() => {
    cy.task('insertDocs', {
      index: '.fleet-agents',
      docs: [createAgentDoc('fleet-server', policyId, 'online', kibanaVersion)],
    });
    cy.task('insertDocs', {
      index: '.fleet-servers',
      docs: [
        {
          '@timestamp': new Date().toISOString(),
        },
      ],
    });
    setFleetServerHost();
  });
}

export function deleteFleetServer() {
  cy.task('deleteDocsByQuery', {
    index: '.fleet-servers',
    query: { match_all: {} },
    ignoreUnavailable: true,
  });
}

export function setFleetServerHost(host = 'https://fleetserver:8220') {
  cy.request({
    method: 'POST',
    url: '/api/fleet/fleet_server_hosts',
    headers: { 'kbn-xsrf': 'xx' },
    body: {
      name: 'Default host',
      host_urls: [host],
      is_default: true,
    },
  });
}
