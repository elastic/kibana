/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from './common';

export function cleanupAgentPolicies() {
  request({ url: '/api/fleet/agent_policies' }).then((response: any) => {
    response.body.items
      .filter((policy: any) => policy.agents === 0)
      .forEach((policy: any) => {
        request({
          method: 'POST',
          url: '/api/fleet/agent_policies/delete',
          body: { agentPolicyId: policy.id },
        });
      });
  });
}

export function unenrollAgent() {
  request({
    url: '/api/fleet/agents?page=1&perPage=20&showInactive=false&showUpgradeable=false',
  }).then((response: any) => {
    response.body.items.forEach((agent: any) => {
      request({
        method: 'POST',
        url: `api/fleet/agents/${agent.id}/unenroll`,
        body: { revoke: true },
      });
    });
  });
}

export function cleanupDownloadSources() {
  request({ url: '/api/fleet/agent_download_sources' }).then((response: any) => {
    response.body.items
      .filter((ds: any) => !ds.is_default)
      .forEach((ds: any) => {
        request({
          method: 'DELETE',
          url: `/api/fleet/agent_download_sources/${ds.id}`,
        });
      });
  });
}

export function deleteFleetServerDocs(ignoreUnavailable: boolean = false) {
  cy.task('deleteDocsByQuery', {
    index: '.fleet-servers',
    query: { match_all: {} },
    ignoreUnavailable,
  });
}
export function deleteAgentDocs(ignoreUnavailable: boolean = false) {
  cy.task('deleteDocsByQuery', {
    index: '.fleet-agents',
    query: { match_all: {} },
    ignoreUnavailable,
  });
}
