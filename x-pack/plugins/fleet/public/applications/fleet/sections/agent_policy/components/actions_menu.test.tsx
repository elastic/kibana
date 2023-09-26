/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { AgentPolicy, PackagePolicy } from '../../../../../../common/types';

import { createFleetTestRendererMock } from '../../../../../mock';

import { AgentPolicyActionMenu } from './actions_menu';

describe('AgentPolicyActionMenu', () => {
  const baseAgentPolicy: AgentPolicy = {
    id: 'test',
    is_managed: false,
    is_protected: false,
    name: 'test-agent-policy',
    namespace: 'default',
    package_policies: [] as PackagePolicy[],
    revision: 1,
    status: 'active',
    updated_at: new Date().toISOString(),
    updated_by: 'test',
  };

  describe('delete action', () => {
    it('is enabled when a managed package policy is not present', () => {
      const testRenderer = createFleetTestRendererMock();
      const agentPolicyWithStandardPackagePolicy: AgentPolicy = {
        ...baseAgentPolicy,
        package_policies: [
          {
            id: 'test-package-policy',
            is_managed: false,
            created_at: new Date().toISOString(),
            created_by: 'test',
            enabled: true,
            inputs: [],
            name: 'test-package-policy',
            namespace: 'default',
            policy_id: 'test',
            revision: 1,
            updated_at: new Date().toISOString(),
            updated_by: 'test',
          },
        ],
      };

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithStandardPackagePolicy} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      agentActionsButton.click();

      const deleteButton = result.getByTestId('agentPolicyActionMenuDeleteButton');
      expect(deleteButton).not.toHaveAttribute('disabled');
    });

    it('is disabled when a managed package policy is present', () => {
      const testRenderer = createFleetTestRendererMock();
      const agentPolicyWithManagedPackagePolicy: AgentPolicy = {
        ...baseAgentPolicy,
        package_policies: [
          {
            id: 'test-package-policy',
            is_managed: true,
            created_at: new Date().toISOString(),
            created_by: 'test',
            enabled: true,
            inputs: [],
            name: 'test-package-policy',
            namespace: 'default',
            policy_id: 'test',
            revision: 1,
            updated_at: new Date().toISOString(),
            updated_by: 'test',
          },
        ],
      };

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithManagedPackagePolicy} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      agentActionsButton.click();

      const deleteButton = result.getByTestId('agentPolicyActionMenuDeleteButton');
      expect(deleteButton).toHaveAttribute('disabled');
    });
  });
});
