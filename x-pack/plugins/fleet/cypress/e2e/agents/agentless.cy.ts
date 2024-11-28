/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_PACKAGE_POLICY_BTN } from '../../screens/fleet';
import { login } from '../../tasks/login';

describe('View agentless policy details', () => {
  beforeEach(() => {
    login();
    cy.intercept('/api/fleet/agent_policies/policy-1', {
      item: {
        id: 'policy-1',
        name: 'Agentless policy for cspm-1',
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        status: 'active',
        supports_agentless: true,
        package_policies: [
          {
            id: 'cspm-1',
            name: 'cspm-1',
            policy_id: 'policy-1',
            policy_ids: ['policy-1'],
            inputs: [],
          },
        ],
      },
    });
  });

  it('should disable the add integration button if the policy support agentless', () => {
    cy.visit('/app/fleet/policies/policy-1');
    cy.getBySel(ADD_PACKAGE_POLICY_BTN).should('not.exist');
  });
});
