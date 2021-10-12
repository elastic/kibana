/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../../mock';

import { PackagePolicyAgentsCell } from './package_policy_agents_cell';

function renderCell({ agentCount = 0, agentPolicyId = '123', onAddAgent = () => {} }) {
  const renderer = createIntegrationsTestRendererMock();

  return renderer.render(
    <PackagePolicyAgentsCell
      agentCount={agentCount}
      agentPolicyId={agentPolicyId}
      onAddAgent={onAddAgent}
    />
  );
}

describe('PackagePolicyAgentsCell', () => {
  test('it should display add agent if count is 0', async () => {
    const utils = renderCell({ agentCount: 0 });
    await act(async () => {
      expect(utils.queryByText('Add agent')).toBeInTheDocument();
    });
  });

  test('it should display only count if count > 0', async () => {
    const utils = renderCell({ agentCount: 9999 });
    await act(async () => {
      expect(utils.queryByText('Add agent')).not.toBeInTheDocument();
      expect(utils.queryByText('9999')).toBeInTheDocument();
    });
  });
});
