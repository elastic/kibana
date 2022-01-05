/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function cleanupAgentPolicies() {
  cy.request('/api/fleet/agent_policies').then((response: any) => {
    response.body.items.forEach((policy: any) => {
      cy.request({
        method: 'POST',
        url: '/api/fleet/agent_policies/delete',
        body: { agentPolicyId: policy.id },
        headers: { 'kbn-xsrf': 'kibana' },
      });
    });
  });
}
